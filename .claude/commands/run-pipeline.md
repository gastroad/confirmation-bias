---
description: RSS 수집부터 DB 저장까지 전체 파이프라인을 실행합니다.
---

# Run Pipeline

RSS 수집과 일별 배치 클러스터링을 순서대로 실행합니다. 두 단계는 **주기가 다릅니다**
(수집 3시간마다 / 클러스터링 하루 1회). 수동 실행 시에는 이어서 돌리면 됩니다.

> **관리자라면 `/admin`에서 버튼으로도 실행할 수 있습니다.** 그쪽은 GitHub Actions를
> `workflow_dispatch`로 돌리므로 로컬 환경이 필요 없습니다(`GITHUB_DISPATCH_TOKEN` 필요).
> 아래는 로컬에서 직접 돌릴 때의 절차입니다.

## 실행 순서

1. **수집** — `npm run collect`
   RSS 피드 17개를 파싱해 `Article`로 직접 적재합니다. `url @unique` + `skipDuplicates`로
   이미 있는 기사는 건너뜁니다. **임베딩하지 않으므로 OpenAI를 부르지 않습니다.**

   - `description`은 **300자로 잘라** 저장합니다(저작권). 일부 매체가 본문 전문을 보냅니다.
   - `pubDate`가 없으면 `dc:date`를 봅니다. 둘 다 없으면(한겨레) 수집 시각으로 대체됩니다.
   - 저작권 차단 목록에 있는 URL은 건너뜁니다.

2. **수집 결과 확인** — `수집 N건 · 신규 M건 적재 · 차단 목록 K건 적용`.
   죽은 피드 경고(`⚠️`)가 있는지 봅니다. 특정 매체가 계속 경고를 내면
   `docs/agent/rss-feeds.md`의 점검법을 따릅니다.
3. **클러스터링** — `npm run cluster:day`
   기본값은 **어제(KST)** 입니다. 방금 수집한 오늘 기사까지 묶으려면 날짜를 지정하세요.

   ```bash
   npm run cluster:day -- --date=$(TZ=Asia/Seoul date +%F)   # 오늘(KST)
   ```

4. **결과 확인** — 출력 표의 `최대`(최대 클러스터 크기)와 `신규임베딩` 수를 봅니다.

## 판단 기준

- **클러스터링은 멱등합니다.** 같은 날짜를 다시 돌리면 그 날짜 클러스터를 지우고 새로 만들므로,
  늦게 도착한 기사가 있으면 그냥 다시 돌리면 됩니다.
- **최대 클러스터 크기는 품질 지표가 아닙니다.** 대형 정치 이벤트 날에는 하루 기사의 15~20%가
  한 이슈에 정당하게 쏠립니다(전당대회 67건, 형소법 통과 85건이 실제 사례).
  판단 기준은 크기가 아니라 **무관한 기사가 섞였는가**입니다.
- **재실행하면 그 날짜의 클러스터 id가 바뀝니다.** 댓글은 `successorByOldCluster`가 가장 많은
  기사를 물려받은 새 클러스터로 옮기지만, 클러스터가 크게 쪼개지면 원래 맥락과 달라질 수
  있습니다. → `docs/agent/comments.md`
- 임계값을 만지고 싶으면 **`--dry-run`으로 먼저** 봅니다. DB에 쓰지 않습니다.

  ```bash
  npm run cluster:day -- --date=2026-08-20 --dry-run --threshold=0.65
  ```

## 에러 처리

- OpenAI **431** 에러는 자동 재시도(최대 5회)되므로 기다립니다.
- **ECONNRESET** 에러도 동일하게 자동 재시도됩니다.
- 클러스터링이 트랜잭션 중간에 실패하면 그 날짜는 이전 상태로 롤백됩니다. 다시 돌리면 됩니다.
- **Prisma 클라이언트 오류**(`Cannot find module '../src/generated/prisma'`)가 나면
  `npm run db:generate`. 보통 `postinstall`·`predev`가 알아서 하지만 스크립트를 직접
  실행할 때는 걸릴 수 있습니다.

## 관련 문서

- 설계·임계값 근거 — `docs/agent/daily-clustering.md`
- 피드 목록·점검법·발췌 정책 — `docs/agent/rss-feeds.md`
- 저작권 차단 목록 — `docs/agent/rss-feeds.md` "표시 중단 요청" 절
