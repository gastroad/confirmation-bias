# 수집 신뢰성 TODO

**2026-08-30 진단.** 기능은 다 붙었는데 **그 기능이 먹는 데이터가 조용히 새고 있다.**
이 문서는 그 진단과 작업 목록이다. 우선순위: **P0(지금 손실 중) → P1(주장을 증명 가능하게) → P2**.

한 줄 요약: **collect의 실행 간격이 8/27부터 3시간에서 최대 15시간으로 벌어졌고, 피드가
3~5시간치만 담는 매체는 그 사이에 통째로 날아갔다. 그런데 워크플로우는 계속 초록불이었다.**

---

## 진단

### 1. cron이 지켜지지 않는다

`collect.yml`의 스케줄은 `17 */3 * * *`(3시간)이다. 실제 실행 간격:

| 구간        | 간격                   |
| ----------- | ---------------------- |
| 8/24 ~ 8/26 | 2.1 ~ 4.2h (정상)      |
| 8/27        | **13.4h**, **10.2h**   |
| 8/28        | **14.9h**, **10.4h**   |
| 8/29        | 8.3h, 6.7h, 4.2h, 2.4h |
| 8/29 → 8/30 | 6.1h                   |

GitHub Actions의 `schedule`은 **SLA가 없다.** 러너 부하에 따라 지연되고 스킵되며, 문서도
"지연될 수 있다"고 명시한다. 3시간 주기를 전제로 설계한 파이프라인이 그 전제를 잃었다.

### 2. 손실이 데이터에 그대로 찍혔다

KST 시간대별 기사 수 — 정상기 3일(8/24~26) vs 지연기 3일(8/27~29):

| KST  | 8/24~26 | 8/27~29 |
| ---- | ------- | ------- |
| 10시 | 272     | **96**  |
| 11시 | 178     | 98      |
| 12시 | 144     | **52**  |
| 16시 | 237     | 124     |
| 18시 | 165     | 113     |

하루 총량도 함께 무너졌다:

| 날짜  | 클러스터 | 기사    |
| ----- | -------- | ------- |
| 08-26 | 335      | 740     |
| 08-27 | 304      | 623     |
| 08-28 | 248      | 527     |
| 08-29 | 155      | **281** |

**RSS는 밀려난 항목을 다시 주지 않는다.** 이 손실은 재수집으로 복구되지 않는다.

### 3. 피드가 담는 시간이 매체마다 10배 이상 다르다

2026-08-30 측정 — 각 피드가 지금 담고 있는 item의 시간 범위:

| 매체       | items | 커버 범위    | 3시간 주기에서            |
| ---------- | ----- | ------------ | ------------------------- |
| 오마이뉴스 | 20    | **3.0h**     | 아슬아슬 — 지연 즉시 손실 |
| 세계일보   | 20    | **5.4h**     | 지연 즉시 손실            |
| 천지일보   | 20    | 27.6h        | 여유                      |
| 뉴시스     | 100   | 28.4h        | 여유                      |
| 프레시안   | 25    | 49.2h        | 여유                      |
| 연합뉴스   | 120   | 52.6h        | 여유                      |
| 조선일보   | 100   | 310.0h       | 여유                      |
| 서울신문   | 13    | **측정불가** | item에 날짜 태그가 없다   |
| 한겨레신문 | **0** | —            | **403 Forbidden**         |

수집 주기가 커버 범위보다 길어지는 순간, 그 매체는 **구조적으로** 기사를 잃는다.
평균으로 보면 문제없어 보이지만 **최단 매체가 파이프라인의 한계를 정한다.**

### 4. 실패가 성공으로 보고된다

`scripts/collect.ts:122`

```ts
} catch (e) {
  console.warn(`  ⚠️  ${outletId}: ${(e as Error).message}`);
  return [];
}
```

피드 하나가 죽어도 빈 배열을 돌려주고 넘어간다. 그리고 로그는 총합 한 줄뿐이다.

```
✅  수집 815건 · 신규 202건 적재
```

**매체별 내역이 없다.** 17곳 중 몇 곳이 0건이었는지, 어제와 비교해 어디가 빠졌는지 알 수 없고,
워크플로우는 언제나 success로 끝난다. 실측된 이상 징후:

- **한겨레신문** — 로컬에서 피드가 **403**(`https://www.hani.co.kr/rss/politics/` → 리다이렉트 후
  nginx가 거부). Actions에서는 아직 들어오고 있지만 UA나 IP 조건이 바뀌면 조용히 끊긴다.
- **여성신문** — 8/28 15:20 이후 신규 적재 0건. 피드는 146시간치를 담고 있으므로 발행이 뜸한
  것으로 보이나, **구분할 방법이 지금 없다.**
- **서울신문** — item에 `pubDate`도 `dc:date`도 없다. 발행 시각이 수집 시각으로 대체되므로
  **수집이 늦어질수록 일별 버킷이 실제 발행일과 어긋난다.** (문서에는 한겨레만 그런 것으로
  적혀 있었다 → [rss-feeds.md](./rss-feeds.md) 갱신 필요)

---

## 왜 이게 기능 추가보다 급한가

이 서비스가 AdSense에 내세운 부가가치이자 유일한 고유 정보는 **"누가 침묵했는가"** 다.

> "보수 성향 매체 3곳(조선일보·동아일보·세계일보)에서는 관련 보도가 확인되지 않았습니다."

색인 대상 클러스터 2,100개의 진영 조합:

| 조합           | 개수    | 비율      |
| -------------- | ------- | --------- |
| 중도+보수      | **961** | **45.8%** |
| 진보+중도+보수 | 906     | 43.1%     |
| 진보+중도      | 153     | 7.3%      |
| 진보+보수      | 80      | 3.8%      |

**색인된 페이지의 절반에서 "진보 매체는 확인되지 않았습니다"가 나간다.** 본문에도, `summary`를
그대로 쓰는 `meta description`·OG·JSON-LD에도.

그런데 **그것이 진짜 침묵인지 우리 수집이 빠진 것인지 지금 구조로는 구분할 수 없다.**
그 시각 오마이뉴스 피드는 3시간치만 담고 있었고, 한겨레는 403이었을 수 있으며, 그 사실은
어디에도 기록되지 않는다.

> **"확인되지 않았습니다"는 이미 정직하게 쓴 문장이다**(→ [adsense-compliance.md](./adsense-compliance.md)의
> P0-2). 우리가 아는 건 "수집한 피드에 없었다"는 사실뿐이라는 걸 문장이 인정하고 있다.
> 문제는 그 **"수집한 피드"가 정상이었는지를 우리 스스로 모른다**는 것이다. 문장은 정직한데
> 근거가 검증 불가능하다.

진영별 누적 기사 수도 이 의심을 키운다:

| 진영 | 전체      | 최근 7일 |
| ---- | --------- | -------- |
| 중도 | 13,917    | 1,795    |
| 보수 | 9,120     | 1,279    |
| 진보 | **4,606** | **872**  |

매체 수는 진영마다 6곳으로 같은데 보수가 진보의 **1.5~2배**다. 누적 격차는 상당 부분
2026-08-24 신규 5곳(오마이뉴스·미디어오늘·한국경제·아시아경제·SBS)의 누적이 아직 없어서지만,
**최근 7일만 봐도 1.47배**다. 이것이 발행량 차이인지 수집 손실인지 **측정한 적이 없다.**

---

## P0 — 손실을 멈추고, 보이게 만든다

### P0-1. 수집 실패를 실패로 만든다

- [ ] **매체별 수집·신규 건수를 로그로** — `수집 815건` 한 줄로는 아무것도 진단할 수 없다.
      매체 17곳 각각의 fetch 결과(item 수 / 신규 / 실패 사유)를 찍는다.
- [ ] **0건·실패 매체를 GitHub Actions annotation으로** — `::warning file=...::` 형식으로 올리면
      실행 요약 화면에 그대로 뜬다. 로그를 열어야만 보이는 `console.warn`은 아무도 안 본다.
- [ ] **실패가 기준을 넘으면 exit 1** — 한 곳쯤은 일시 장애일 수 있으니 전량 실패로 두지 않되,
      **실패 매체가 3곳 이상이거나 특정 진영이 통째로 비면** 실패시킨다. 그래야 GitHub이 메일을
      보낸다(파이프라인 실패 알림은 이미 이 경로에 의존하고 있다 → [launch-todo.md](./launch-todo.md)).
- [ ] **User-Agent 헤더 추가** — 현재 `fetch(feedUrl, { signal })`에 헤더가 없다. 한겨레의 403은
      이것으로 막힐 가능성이 높다. 봇임을 숨기지 않는 정직한 UA를 쓴다
      (`confirmation-bias/1.0 (+https://www.confirmationbias.app)`).

### P0-2. cron 지연에 대응한다

- [ ] **주기 단축** (`17 */2 * * *`) — 지연이 상수처럼 붙는다면 주기를 줄여 갭의 상한을 낮춘다.
      Actions 무료 분은 실행당 1분 남짓이라 여유가 있다. **다만 이건 완화이지 해결이 아니다.**
- [ ] **직전 성공 실행과의 간격을 로그·경고로** — 워크플로우 시작 시 마지막 성공 시각과의 간격을
      계산해 6시간을 넘으면 경고한다. 지금은 갭이 생겨도 사후에 `gh run list`를 훑어야 안다.
- [ ] **외부 트리거 검토** — Actions 스케줄러 의존을 끊는 유일한 방법. 외부 cron 서비스가
      `workflow_dispatch`를 호출하면 시각이 지켜진다. `server/github.ts`에 이미 dispatch 호출이
      있으므로(`/admin` 수동 트리거) 경로 자체는 검증되어 있다.
      Vercel Cron은 **Hobby 플랜이 하루 1회 제한**이라 대안이 못 된다.

### P0-3. 짧은 피드를 파이프라인의 기준으로 삼는다

- [ ] **피드 커버 범위 측정을 상시화** — 일회성 스니펫(부록)을 `scripts/`로 올려 정기 점검한다.
      **커버 범위가 수집 주기보다 짧은 매체가 생기면 그 자체로 경고**다.
- [ ] **한겨레·서울신문 피드 재점검** — 403 대응(P0-1의 UA)과, 서울신문의 날짜 태그 부재로 인한
      버킷 오차. 서울신문은 `pubDate`·`dc:date`가 모두 없어 `pickPublishedRaw()`가 손댈 수 없다.
      링크의 기사 ID(`id=20260831006002`)에 날짜가 들어 있으므로 그것으로 보정할 수 있다.
      → [rss-feeds.md](./rss-feeds.md)

---

## P1 — 주장을 증명 가능하게

### P1-1. 수집 커버리지를 데이터로 남긴다

- [ ] **`CollectionRun` 기록** — 실행 시각 · 매체별 fetch 성공 여부 · item 수 · 신규 건수.
      한 실행당 17행이면 하루 200행 남짓이라 storage 부담이 없다(현재 101MB / 0.5GB).

      이게 있어야 비로소 말할 수 있다:
      **"그날 그 매체의 피드는 정상 수집됐고, 그럼에도 이 사건은 없었다."**
      지금은 이 문장을 뒷받침할 근거가 DB에 존재하지 않는다.

- [ ] **관리자 화면에 커버리지 노출** — `/admin`에 최근 실행별 매체 상태. 죽은 피드를 며칠씩
      모르고 지나가는 걸 막는다.

### P1-2. 요약 문장을 커버리지에 연동한다

- [ ] **수집이 실패한 매체는 침묵 문장에서 제외** — P1-1의 기록을 `summary.ts`가 참조해,
      그날 fetch가 실패한 매체는 "확인되지 않았습니다" 목록에 넣지 않는다.
      **문장을 약하게 만드는 게 아니라 정확하게 만드는 일이다.**
- [ ] **진영이 통째로 빠진 날은 편중 문장을 만들지 않는다** — 진보 매체 6곳이 전부 실패한 날의
      "진보 0곳"은 데이터가 아니라 사고다.

### P1-3. 남은 런칭 TODO 중 싼 것

- [ ] **CI에 `next build` 추가** — 15분. 현재 빌드 게이트가 Vercel Preview뿐이다.
      → [launch-todo.md](./launch-todo.md)

---

## P2

- [ ] **진영별 발행량 baseline 측정** — 수집 손실을 걷어낸 뒤에도 남는 격차가 실제 발행량 차이다.
      그 값을 알면 `/about`에 "보수 매체가 정치 기사를 더 많이 발행한다"는 사실을 근거와 함께
      쓸 수 있고, 편중 지표를 발행량으로 정규화할지 판단할 수 있다.
- [ ] **오래된 클러스터 아카이빙** — → [launch-todo.md](./launch-todo.md)
- [ ] **제목 프레이밍 분석** — → [adsense-compliance.md](./adsense-compliance.md) P2

---

## 하지 않기로 한 것

- **주기를 무작정 줄이지 않는다.** `*/30`으로 만들어도 Actions 지연은 그대로이고 실행 분만
  8배가 된다. 갭의 상한을 낮출 뿐 시각을 보장하지 못한다 — 보장이 필요하면 P0-2의 외부 트리거다.
- **놓친 기사를 소급 수집하지 않는다.** RSS는 지나간 항목을 주지 않고, 언론사 아카이브를 긁는 건
  RSS 수집과 성격이 다른 크롤링이라 저작권 판단이 달라진다(→ [rss-feeds.md](./rss-feeds.md)).
  **손실은 인정하고, 앞으로를 막는다.**
- **불균형을 보정하려고 진보 매체를 더 넣지 않는다.** 원인을 모르는 채 매체를 추가하면 편향의
  방향만 바꾼다. P1-1로 원인을 먼저 갈라야 한다.

---

## 부록 — 진단 재현

### 실행 간격

```bash
gh run list --workflow=collect.yml --limit 30 --json createdAt --jq '.[].createdAt' | sort
```

### 피드 커버 범위

```bash
node -e '
const specs = require("./scripts/feed_specs.json").politics;
(async () => {
  for (const s of specs) {
    const res = await fetch(s.url, { signal: AbortSignal.timeout(15000) });
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1);
    const dates = items
      .map((i) => (i.match(/<pubDate>([^<]+)</i) || i.match(/<dc:date>([^<]+)</i) || [])[1])
      .map((d) => d && new Date(d))
      .filter((d) => d && !isNaN(d));
    const span = dates.length >= 2 ? ((Math.max(...dates) - Math.min(...dates)) / 3600000).toFixed(1) : "?";
    console.log(s.name.padEnd(8), "items=" + items.length, "span=" + span + "h");
  }
})();
'
```

### 시간대별 손실

```sql
SELECT to_char("publishedAt" + interval '9 hour', 'HH24') AS hr,
  count(*) FILTER (WHERE ("publishedAt" + interval '9 hour')::date BETWEEN '2026-08-24' AND '2026-08-26') AS 정상,
  count(*) FILTER (WHERE ("publishedAt" + interval '9 hour')::date BETWEEN '2026-08-27' AND '2026-08-29') AS 지연
FROM "Article"
WHERE ("publishedAt" + interval '9 hour')::date BETWEEN '2026-08-24' AND '2026-08-29'
GROUP BY 1 ORDER BY 1;
```

### 매체별 신규 적재 추이

```sql
SELECT o.name, o.leaning, max(a."createdAt")::text AS last_created,
  count(*) FILTER (WHERE a."createdAt" > now() - interval '24 hour')  AS d1,
  count(*) FILTER (WHERE a."createdAt" > now() - interval '168 hour') AS d7
FROM "Outlet" o LEFT JOIN "Article" a ON a."outletId" = o.id
GROUP BY o.id, o.name, o.leaning ORDER BY d7 DESC;
```

`createdAt`은 `createMany` 배치마다 동일한 값이 찍히므로 **적재 시각이지 발행 시각이 아니다.**
매체가 살아 있는지 볼 때만 쓴다.

### 색인 대상의 진영 조합

```sql
WITH c AS (
  SELECT cl.id, cl."articleCount" AS n,
    bool_or(o.leaning IN ('left','center_left'))   AS p,
    bool_or(o.leaning IN ('right','center_right')) AS k,
    bool_or(o.leaning = 'center')                  AS m
  FROM "Cluster" cl
  JOIN "Article" a ON a."clusterId" = cl.id
  JOIN "Outlet" o ON o.id = a."outletId"
  GROUP BY cl.id, cl."articleCount"
)
SELECT (CASE WHEN p THEN '진보 ' ELSE '' END) || (CASE WHEN m THEN '중도 ' ELSE '' END) ||
       (CASE WHEN k THEN '보수' ELSE '' END) AS combo, count(*)
FROM c WHERE n >= 3 AND (p::int + k::int + m::int) >= 2
GROUP BY 1 ORDER BY 2 DESC;
```

---

## 관련 문서

- [rss-feeds.md](./rss-feeds.md) — 피드 목록·죽은 피드·`pubDate` 처리.
  한겨레 403과 서울신문 날짜 태그 부재를 2026-08-30에 반영했다.
- [pipeline-scheduling.md](./pipeline-scheduling.md) — 수집·클러스터링 분리 설계와 주기 결정 경위.
- [adsense-compliance.md](./adsense-compliance.md) — 요약 문장이 왜 이 서비스의 핵심인지.
- [launch-todo.md](./launch-todo.md) — 전체 런칭 TODO. "파이프라인 실패 알림"이 GitHub 기본
  알림으로 충족됐다고 적혀 있으나, **워크플로우가 실패하지 않으므로 그 알림이 울리지 않는다.**
