# Architecture

## 전체 데이터 흐름

수집과 클러스터링이 **분리**되어 있다. RSS는 항목이 빠르게 밀려 나가 자주 긁어야 하지만,
클러스터링은 KST 하루가 닫힌 뒤 한 번만 하면 된다.

```
RSS 피드
  └─▶ scripts/collect.ts        — 3시간마다. 피드 파싱 → Article 직접 적재 (임베딩·클러스터링 없음)
        └─▶ Postgres (Neon)
              ▲
              │
  scripts/cluster-day.ts        — 하루 1회(KST 05:00). 그날 기사를 통째로 다시 클러스터링
    └─▶ server/clustering/daily.ts
          ├─ 임베딩 없는 기사만 배치 임베딩 (100건/request)
          ├─ hac.ts — average linkage 응집 클러스터링 (threshold 0.62)
          ├─ summary.ts — 진영별 보도·침묵·시차를 문장으로 (자체 작성 텍스트)
          └─ 트랜잭션: 해당 날짜 클러스터 삭제 → 재생성 → 기사 배정  ⇒ 멱등
  scripts/prune-embeddings.ts   — 같은 cron 뒤에. 14일 지난 임베딩을 NULL로 (storage 증가율 1/3)
              │
              └─▶ server/queries/*  — 순수 Prisma 조회 (커서 페이지네이션/집계)
                    └─▶ API 라우트 (src/app/api/**)  — 파라미터 파싱 + 도메인 매핑
                          └─▶ 클라이언트 (react-query)  — 무한 스크롤 피드 / 상세는 서버 컴포넌트가 server/queries 직접 호출
```

클러스터링 단위는 **KST 기준 하루**이고 날짜 간 격리다. 어제 23:50과 오늘 00:10이 같은
사건이어도 다른 클러스터가 된다. 설계 근거는 [daily-clustering.md](./daily-clustering.md).

## 디렉토리 역할

| 경로                                  | 역할                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `server/db.ts`                        | Prisma 싱글턴. 전체 BE에서 이것만 import                                             |
| `server/auth.ts`                      | Neon Auth 인스턴스 + 세션 래퍼. **SDK 의존을 여기로 격리** → [auth.md](./auth.md)    |
| `server/session-cookie.ts`            | 세션 쿠키 존재 판정(순수 함수). 왕복 단축 → [caching.md](./caching.md)               |
| `server/cache.ts`                     | 캐시 수명 상수. 캐싱은 DTO 경계에서 → [caching.md](./caching.md)                     |
| `server/github.ts`                    | `workflow_dispatch` 호출 (관리자 수동 트리거)                                        |
| `server/queries/clusters.ts`          | 클러스터 조회(커서 페이지네이션·상세·집계). 순수 Prisma                              |
| `server/queries/days.ts`              | 날짜별 집계(날짜 내비·sitemap). `Cluster`만으로 계산                                 |
| `server/queries/outlets.ts`           | 언론사별 집계(`/outlets`·`/outlets/[id]`) — 전부 자체 계산값                         |
| `server/queries/comments.ts`          | 댓글 조회·작성·삭제. 권한 판정을 where 절에 넣는다 → [comments.md](./comments.md)    |
| `server/queries/blocked-urls.ts`      | 저작권 차단 목록. 등록과 기존 기사 삭제를 한 트랜잭션으로                            |
| `server/feed-entities.ts`             | 피드 텍스트의 HTML 엔티티 복원(프레시안의 `&` 빠진 `quot;` 포함). collect가 쓴다     |
| `server/clustering/embed.ts`          | OpenAI text-embedding-3-small 배치 호출 (100건/req, 5-retry, 431 방어)               |
| `server/clustering/similarity.ts`     | 내적·코사인 유사도 순수 함수                                                         |
| `server/clustering/vector.ts`         | 임베딩 Float32 bytes 인코딩·정규화·centroid                                          |
| `server/clustering/bucket.ts`         | KST 날짜 버킷 변환 (`toBucketDate` 등)                                               |
| `server/clustering/retention.ts`      | 임베딩 보존 기간(14일)·cutoff. 근거 수치를 상수 옆에 둔다                            |
| `server/clustering/hac.ts`            | 응집 클러스터링 (average linkage, 순수 함수)                                         |
| `server/clustering/daily.ts`          | 일별 배치 오케스트레이션 (`clusterDay`, threshold 0.62)                              |
| `server/clustering/representative.ts` | 대표 제목 선정(centroid 최근접, **사진 캡션 제외**). 순수 함수                       |
| `server/clustering/summary.ts`        | 클러스터 요약 문장 생성 (보도 편중·침묵한 진영·보도 시차). **LLM 미사용, 순수 함수** |
| `scripts/feed_specs.json`             | 수집 대상 피드 목록. `OUTLETS`와 따로 관리한다 → [rss-feeds.md](./rss-feeds.md)      |
| `scripts/collect.ts`                  | RSS 수집 → Article 직접 적재. `pubDate`/`dc:date` → [rss-feeds.md](./rss-feeds.md)   |
| `scripts/cluster-day.ts`              | 하루치 클러스터링 실행 (`--date`/`--from..--to`/`--all`/`--dry-run`)                 |
| `scripts/backfill-titles.ts`          | 캡션 대표 제목만 다시 골라 UPDATE. **클러스터를 재생성하지 않는다**                  |
| `scripts/backfill-photo-only.ts`      | `Cluster.photoOnly`(기사 전부가 사진 캡션)만 UPDATE. 참이면 색인 제외 → 404          |
| `scripts/backfill-summary.ts`         | 기존 클러스터에 `summary`만 UPDATE. **클러스터를 재생성하지 않는다**                 |
| `scripts/prune-embeddings.ts`         | 14일 지난 임베딩을 비운다. **기본 dry-run**. VACUUM은 안 한다                        |
| `scripts/grant-admin.ts`              | 최초 관리자 부여(`neon_auth."user"` 직접 갱신) → [auth.md](./auth.md)                |
| `scripts/vercel-ignore-build.sh`      | Vercel Ignored Build Step. 워크트리 씨앗 커밋의 프리뷰 빌드를 건너뛴다               |
| `prisma/schema.prisma`                | Outlet / Cluster / Article 모델                                                      |
| `src/`                                | FSD 구조 Next.js 앱 (아래 별도 설명)                                                 |

## FSD 레이어 (src/)

```
shared/          — 프레임워크 무관 유틸 / 스타일
  config/        — site.ts(SEO·브랜드), search-params.ts(URL 쿼리 파라미터 이름)
  lib/           — format.ts, bucket-date.ts, theme.ts(테마 저장·구독), useInfiniteScroll.ts,
                   gtm.ts(동의 기본값 → GTM 로드 순서)
  styles/        — theme.css.ts(토큰·라이트/다크), layout.css.ts(page·gutters·container·prose)
  ui/            — Button(모든 버튼의 단일 출처), Logo, Skeleton, icons, ThemeScript(FOUC 방지),
                   AdSenseLoader(콘텐츠 페이지 전용), TagManager(루트 — GTM→GA4)
entities/        — 도메인 모델 + dumb UI ( @x/ = 형제 entity 전용 공개 API )
  outlet/        — model.ts(순수·css 무의존), lib.ts(집계 DTO·요약 문장), leaning-colors.ts,
                   ui/(LeaningBar·TiltLabel), index.ts
                   @x/article.ts · @x/cluster.ts — 대상별로 여는 범위를 다르게 적는다
  article/       — model.ts, @x/cluster.ts, index.ts
  cluster/       — model.ts(+색인 기준), lib.ts(DTO 매핑·색인 판정·선별 규칙·보도 시차 기하),
                   api.ts, ui/(ClusterCard — 목록 항목의 본문), index.ts
  comment/       — model.ts, lib.ts(canDelete 계산), api.ts, index.ts
features/        — 사용자 인터랙션 (상태 가능)
  outlet-filter/ — model.ts(parseOutletParam), ui/, index.ts
  profile-menu/  — ui/(ProfileMenu) — 테마·로그인·관리·탈퇴를 한 드롭다운에
  date-nav/      — model.ts(parseDateParam·datePath), ui/(DateNav — 날짜를 크게 세우는 지면 머리), index.ts
  auth-form/     — model.ts(AuthFormState), ui/(AuthForm), index.ts
widgets/         — 페이지 조각 (여러 entity 조합)
  cluster-feed/
  cluster-detail/  — 상세 본문. LagStrip(보도 시차)이 "세 갈래 제목" 바로 위에 선다
  cluster-comments/
  outlet-profile/  — 언론사 페이지 본문(통계·추이 차트·중복 매체·최근 이슈)
  site-header/     — 모든 페이지가 공유하는 지면 머리(브랜드 락업·백링크·주요 메뉴·프로필)
  site-footer/     — 지면 바닥(약관·방침·문의). 루트 레이아웃이 한 번만 세운다
app/             — Next.js App Router
  _shell.tsx     — **모든 페이지의 셸**(세션 조회 → 헤더 → main). 페이지는 본문만 넘긴다
  _session.ts    — getUser = cache(getSessionUser). 요청당 인증 왕복 1회
  _cluster-data.ts — 목록·집계 DTO 캐시. **API 라우트와 첫 화면 SSR이 함께 쓴다**
  _feed-seed.ts  — 목록 첫 페이지를 서버에서 받아 dehydrate (초기 HTML에 이슈를 싣는다)
  page.tsx       — 홈. 최신 날짜를 직접 렌더(리다이렉트하지 않는다)
  d/[date]/      — 날짜별 목록 (YYYY-MM-DD)
  clusters/[id]/ — 클러스터 상세
  auth/          — sign-in · sign-up · actions.ts (Server Action)
  account/       — delete(회원 탈퇴). /auth 레이아웃 밖에 둔다(로그인 상태에서 쓰는 화면)
  terms/         — 이용약관
  about/         — 소개 및 방법론. 성향 분류 근거·클러스터링 방식·**한계 고지**
  outlets/       — 언론사 허브 + `[id]` 상세. `_data.ts`가 집계를 6시간 캐시
  weekly/        — 주간 리포트(선별 게재). 선별 규칙은 `entities/cluster`에, 화면에도 그대로 노출
  error.tsx · not-found.tsx — 상태 화면 (**loading.tsx는 두지 않는다** — 아래 "상태 코드")
  admin/         — 관리자 전용. 수집·클러스터링 트리거 · comments(댓글 관리) · blocked(저작권 차단)
  api/           — clusters · clusters/[id] · clusters/stats · days · comments · auth/[...path]
proxy.ts         — 라우트 보호. Next 16에서 middleware.ts가 이 이름으로 바뀌었다
```

**레이어 의존 방향:** `app → widgets → features → entities → shared` (단방향).
**`eslint.config.mjs`가 강제한다** — 아래 항목은 문서가 아니라 lint 에러다.

- `server/` import는 API 라우트(`src/app/api/**`)와 서버 컴포넌트만. entities/widgets/features는 `entities/*/api.ts` 클라이언트 fetcher로 HTTP 호출 (DB 직접 접근 금지)
- `features/`는 상태·인터랙션 허용(entities의 `ui/` dumb 규칙과 다름). 필터·정렬 등도 여기에 추가
- **entity끼리는 `@x`로만 연결한다.** 같은 레이어라 배럴로 서로 부를 수 없다. 방향은
  `outlet ← article ← cluster`(비순환), `comment`는 독립 → [conventions.md](./conventions.md)의 "cross-entity"
- **URL 쿼리 파라미터 이름은 `shared/config/search-params.ts`.** entities(fetcher)·features(필터
  UI)·app(API 라우트)이 함께 쓰는 계약이라 가장 아래에 둔다. features에 있던 동안
  `entities/cluster/api.ts`가 `"outlets"`를 문자열로 다시 박았다
- **셸이 위젯이 아니라 `app/`에 있는 이유가 이 규칙이다.** 셸은 세션을 읽어야 하는데
  `server/` 접근은 app 레이어에만 허용된다. 위젯(`site-header`)은 세션을 props로 받는다.

## 중심선(meridian) — 화면의 축

성향 분포를 그리는 방식이 이 서비스의 시각적 주장이다. 손대기 전에 읽는다.

`LeaningBar`는 막대를 **폭이 아니라 위치**로 그린다. 중도 구간의 중점이 항상 트랙 50%에
놓이도록 막대 전체를 왼쪽으로 밀고, 막대는 트랙 폭의 **50%만** 차지한다(한쪽으로 100%
쏠려도 잘리지 않는 최대 폭). 한쪽으로 튀어나온 길이가 곧 그 이슈의 편향이다.

```
progressive + neutral/2 = midpoint      ← 막대 안에서 중도 중점의 위치(%)
left            = 50% − midpoint × 0.5  ← 트랙 좌측에서의 시작점
transform-origin = midpoint             ← 진입 애니메이션이 자라는 지점 = 중심선
```

**`transform-origin`을 `center`로 두면 안 된다.** 막대의 기하학적 중심과 중도 중점은
다르므로, 막대가 중심선 밖에서 자라 들어온다.

`ClusterFeed`의 카드는 이 축을 세로선으로 관통시킨다(`card::before` / `skeletonCard::before`).
카드가 세로 스택(제목 → 막대 → 수치 한 줄)이고 좌우 패딩이 대칭이라 **중심선은 언제나
`left: 50%`** 다. 하루 전체 스펙트럼(`dayTrack`)은 카드와 같은 좌우 패딩만 주면 축과 폭이
동시에 맞는다.

- **수치를 우측 열에 몰지 않는다.** 예전엔 행이 `1fr <메타열>` 그리드였고 중심선을
  `calc(50% - (메타열 + gap) / 2)`로 밀어 맞췄는데, 카드 무게가 오른쪽으로 쏠려 축이
  기울어 보였다. 건수·언론사 수(왼쪽)와 편향 라벨(오른쪽)을 막대 아래 한 줄에 마주 세워
  좌우 균형을 잡았다.
- **세로선은 목록(`ul`)이 아니라 카드에 건다.** hover 배경이 카드 위에 깔리므로 `list::before`로
  그리면 커서가 얹힌 줄만 축이 끊긴다. 카드의 `::before`는 배경 위·막대 아래에 놓인다
  (positioned 형제 중 DOM 순서가 앞이라 막대가 축을 가린다 — 의도한 순서다).
- **축을 관통시킬지는 카드 본문이 아니라 그 목록이 정한다.** 카드 본문(제목·막대·수치 한 줄)은
  `entities/cluster`의 `ClusterCard`로 공용이지만 중심선은 `cluster-feed` 위젯에만 있다.
  주간 리포트는 순위 열(28px)만큼 막대가 오른쪽으로 밀려 있어 행의 50%가 막대의 중점이
  아니다 — 거기에 축을 그으면 맞지 않는 자리에 축이 선다.

편향 수치는 `calcTilt`(진보 기사% − 보수 기사%)이고, `TILT_BALANCE_THRESHOLD`(±5%p) 안이면 "균형"으로
본다. 이 임계값은 디자인이 아니라 **서비스의 주장**이라 화면(목록 헤더)에 그대로 노출한다.

### 매체당 상한 — 한 매체가 수치를 정하지 못하게 (2026-10-23, 정의 v2)

비율의 분자·분모는 **반영 기사 수**다. `countLeaningDistribution`이 한 이슈에서 매체당
`OUTLET_ARTICLE_CAP`(3)건까지만 센다. 막대 기하·`tilt`·하루 스펙트럼·주간 리포트 선별이 전부
이 분포에서 나오므로 **막대와 수치가 갈리지 않는다.** `articleCount`(카드의 "N건")는 수집 건수
그대로이고, 반영 건수는 `countedArticleCount`에 따로 싣는다.

- 계기: 천지일보 기사의 51%가 포토다. 국감 하루에 같은 장면 캡션 18건이 한 클러스터에 묶여
  매체 3곳짜리 이슈가 "보수 +95%p"로 주간 리포트 1위에 올랐고, TOP10 중 5건이 그런 이슈였다.
- **지표를 둘로 나누지 않는다**(보도량 편중 / 매체 참여 편중). 카드에 막대가 둘이면 카드끼리
  한 중심선으로 비교한다는 이 화면의 주장이 깨진다. 막대 하나에서 왜곡만 걷어낸다.
- 3인 근거(이슈·매체 쌍 기준): 91%가 2건 이하다. 상한 1은 매체 수를 세는 것과 같아 색인 대상의
  57%가 바뀌고, 3이면 4건 이상인 꼬리(5%)만 깎여 13%가 바뀐다.
- 상한으로 수치만 깎으면 표본이 작다는 사실은 남는다(매체 3곳이면 상한 1이어도 ±67%p).
  그래서 주간 리포트의 표본 하한(`SPLIT_MIN_ARTICLES`)도 **반영 기사 수**로 잰다.
- 하루 스펙트럼은 클러스터마다 상한을 적용한 뒤 더한다. `findClusterStats`가 SQL로 세고,
  상한 값은 `STATS_OUTLET_ARTICLE_CAP`으로 넘겨받는다(`server/`는 `src/`를 import할 수 없다).
- 색인 기준(`INDEX_MIN_ARTICLES`)은 **수집 건수 그대로**다. 반영 건수로 바꿀지 검토했고
  (2026-10-23) **바꾸지 않았다** — 진영 2개 이상이면 매체도 2곳 이상이라 두 기준의 통과 집합이
  같다(실측 27,540개 중 차이 0). 단 이건 상한이 `INDEX_MIN_ARTICLES − INDEX_MIN_LEANING_GROUPS + 1`
  (= 2) 이상일 때만 성립한다. 상한을 1로 내리면 갈리고, 그러면 404가 되는 페이지 집합이 바뀐다(P0-6).
  `entities/cluster/lib.test.ts`의 "색인 기준 — 수집 건수와 반영 건수가 같은 집합을 고른다"가
  이 결론을 들고 있다.
- 상세 페이지는 상한이 걸린 매체를 판정 문장 아래에 밝힌다(`findCappedOutlets`). 막대 라벨의
  건수가 아래 세 열의 건수와 다른 이유를 화면이 스스로 말해야 한다.

**정의를 바꾸면 `TILT_METHOD_VERSIONS`에 항목을 추가한다.** /about이 그 이력과 계산 예시
(`workTiltExample` — 숫자를 손으로 적지 않고 같은 함수로 계산한다)를 그린다. `model.test.ts`의
"편중 수치 정의"가 예시 결과를 현재 버전 번호와 함께 못박아, 이력 없이 계산만 바뀌면 깨진다.
v1 시절 /about은 "진보 매체 비율 − 보수 매체 비율"이라고 적었고 코드는 기사 수를 세고 있었다.

## 버튼 — 생김새는 `shared/ui/Button` 하나에서 나온다

`<button>`이든 버튼처럼 생긴 `<Link>`든 **자기 css.ts에 버튼을 새로 정의하지 않는다.**

```tsx
<Button type="submit" disabled={pending}>차단</Button>        // 기본 = primary · md
<Button variant="quiet" size="xs">삭제</Button>
<Link href="/" className={buttonClass({ variant: "secondary", size: "lg" })}>홈으로</Link>
```

- `variant` — `primary`(권하는 동작) · `danger`(되돌릴 수 없는 동작) · `secondary`(나란한 대안) ·
  `quiet`(행 끝에 숨은 파괴적 동작. hover에서만 danger로 드러난다)
- `size` — `xs`(행 안) · `sm` · `md`(기본) · `lg`(그 화면의 주 동작)
- `Button`은 `<button>`을 그리고 `type` 기본값이 `"button"`이다. `<Link>`·`<a>`에는
  `buttonClass()`로 클래스만 입힌다 — shared는 프레임워크를 모르므로 next/link가 들어오지 않는다.
- 바깥 자리가 정하는 것(`alignSelf`·`flex: 1`·`marginTop`)만 `className`으로 얹는다.
  색·패딩·글자 크기를 얹기 시작하면 흩어져 있던 시절로 돌아간다.
- **테두리는 투명한 1px이 기본이다.** 채운 버튼과 윤곽 버튼이 같은 `size`에서 같은 높이로
  서야 나란히 놓았을 때 어긋나지 않는다(예전엔 `border: none`과 1px이 섞여 2px씩 어긋났다).

10개 css.ts에 흩어져 있던 것을 2026-09-07에 모았다. 그중 7곳이 accent 배경 버튼을 각자
정의했는데 패딩이 `8px 16px`·`9px 14px`·`9px 16px`·`10px 18px`·`11px 12px`로 다 달랐고
disabled 투명도도 0.4/0.5/0.6으로 갈려 있었다.

## 첫 화면은 서버에서 그린다 (2026-10-22)

**목록이 초기 HTML에 들어 있어야 한다.** `ClusterFeed`는 react-query로 받는 클라이언트
위젯이라, 전엔 초기 HTML에 스켈레톤만 있고 이슈가 한 건도 없었다 — 홈·날짜 페이지의 본문
텍스트가 **132자**였고 광고가 뜨는 72개 페이지가 전부 그 상태였다. 심사 통보 항목
"가치가 별로 없는 콘텐츠"와 겹치는 지점이다 → [adsense-compliance.md](./adsense-compliance.md).

위젯을 서버 컴포넌트로 바꾸지 않았다. **같은 위젯이 서버에서도 데이터를 갖게** 했다.

```
page.tsx ──▶ seedClusterFeed(outletIds, date)   ← _feed-seed.ts
               └─ getClustersPage / getClusterStats  ← _cluster-data.ts (라우트와 공용 캐시)
                    └─ dehydrate()
             <HydrationBoundary state={...}>
               <ClusterFeed date outletIds />   ← 렌더 중에 hydrate되어 SSR에서 데이터를 본다
```

- **`ClusterFeed`는 `useSearchParams`를 부르지 않는다.** 그 훅을 부르면 서브트리가 셸에서
  떨어져 나가 클라이언트에서만 렌더되고, 초기 HTML에 목록이 남지 않는다. 언론사 필터는
  페이지가 `searchParams`로 읽어 **props로 내려준다.** 필터를 바꾸면 `OutletFilter`가 URL을
  갈고 서버가 다시 그리므로 값은 그대로 따라온다.
- **`Suspense`는 `OutletFilter`에만 씌운다.** 목록까지 그 안에 넣으면 경계째 지연 렌더로
  밀린다. `HydrationBoundary`는 경계 **밖**이고, 페이지가 먼저 await해서 state를 넘긴다.
- 쿼리 키는 `entities/cluster`의 `clusterQueryKeys` 하나에서 나온다. 씨앗과 위젯의 키가
  한 글자라도 어긋나면 서버가 심어 둔 데이터를 위젯이 못 찾아 다시 스켈레톤이 된다.
- `e2e/home.spec.ts`의 "첫 화면 SSR" 절이 이걸 지킨다 — **브라우저가 아니라 `request`로 날
  HTML을 받아** 이슈 제목이 들어 있는지 본다(브라우저로 열면 react-query가 뒤이어 받아오므로
  SSR과 클라이언트 렌더를 구분할 수 없다).

> ⚠️ 이 앱의 페이지 본문은 **원래 전부** `<div hidden>`으로 스트리밍된 뒤 인라인 스크립트가
> 제자리로 옮긴다(루트 `loading.tsx`가 만드는 Suspense 경계 + 셸이 쿠키를 읽어 전 페이지가
> 동적이라서다). `/about`·`/weekly`처럼 클라이언트 훅이 없는 페이지도 같다. 콘텐츠는 **같은
> 응답 본문에 실려 있고** JS를 실행하는 크롤러(Googlebot·AdsBot)는 최종 DOM을 본다 — 위
> 변경이 고친 것은 "HTML에 아예 없던" 문제이고, 이 스트리밍 자체는 그 전부터의 구조다.

## 상태 코드는 Suspense 경계가 정한다 (2026-10-22)

**경계가 있으면 `notFound()`가 HTTP 200이 된다.** 응답이 200으로 먼저 스트리밍되고 그 뒤에는
상태 줄을 되돌릴 수 없다 — 화면과 robots 메타(noindex)는 맞지만 **soft 404**다. Next 문서가
"404 상태가 필요하면 본문이 스트리밍되기 전에 리소스 존재를 확인하라"고 명시한다.

그래서 **`loading.tsx`를 두지 않는다.** 루트에 있던 동안 라이브 `/clusters/<없는 id>`가
200을 냈다 — 기준 미달 페이지 22,691개를 404로 내리는 것이 P0-6인데 soft 404면 효과가 없다.

| 라우트           | `notFound()` 결과 | 초기 HTML 본문            |
| ---------------- | ----------------- | ------------------------- |
| `/clusters/[id]` | **404** ✅        | 인라인                    |
| `/d/[date]`      | **404** ✅        | **인라인 1,390자** = 전체 |
| `/` (홈)         | —                 | **인라인 1,400자** = 전체 |

**경계 하나가 그 서브트리의 상태 코드와 초기 HTML을 동시에 바꾼다.** 경계가 있으면
`<div hidden>`으로 스트리밍된 뒤 인라인 스크립트가 제자리로 옮기므로, JS를 실행하지 않는
크롤러에겐 빈 지면이다. 전부 없앤 뒤 홈·날짜 페이지 본문이 **HTML에 그대로** 실린다 —
"첫 화면은 서버에서 그린다"가 이것으로 완성된다.

- **스켈레톤을 잃은 대가는 작다.** 경계가 없으면 Next가 새 페이지가 준비될 때까지 **이전
  화면을 그대로 보여준다** — 날짜를 옮길 때 스켈레톤이 깜빡이는 것보다 자연스럽다.
  (초기 진입은 어차피 완성된 HTML이 온다.)
- **`loading.tsx`를 다시 추가하려면** 그 서브트리가 soft 404로 돌아가고 본문이 hidden
  스트리밍이 된다는 것을 먼저 받아들여야 한다. `e2e/navigation.spec.ts`·
  `e2e/cluster-detail.spec.ts`가 상태 코드를, `e2e/home.spec.ts`가 초기 HTML을 못박아 둔다.

## 페이지 셸 — 세션·헤더·본문 컨테이너를 한 곳에

**페이지는 본문만 쓴다.** 세션 조회 · `<SiteHeader>` · `<main class=container>`는
`app/_shell.tsx`의 `AppShell`이 세운다. 페이지가 넘기는 것은 다섯 개뿐이다.

| prop    | 뜻                                                                    |
| ------- | --------------------------------------------------------------------- |
| `back`  | 돌아갈 곳이 홈이 아닐 때만 (`{ href, label }`)                        |
| `title` | 브랜드 자리에 다른 이름을 세우는 화면(관리 콘솔)                      |
| `hero`  | 홈만. 로고를 크게 세우고 태그라인을 단다                              |
| `prose` | 읽는 글(소개·약관·방침). 본문 열을 좁힌다                             |
| `ads`   | 색인 기준을 넘긴 콘텐츠 페이지에서만 true → `shared/ui/AdSenseLoader` |

- **셸을 복붙하면 반드시 드리프트가 난다.** 13개 페이지가 각자 들고 있던 동안 회원 탈퇴
  화면은 헤더가 통째로 빠졌고(돌아갈 길이 푸터뿐이었다), 약관·방침·소개는 자체 컨테이너를
  써 헤더·푸터와 세로줄이 어긋났다. 2026-09-07에 셸로 모으며 함께 고쳤다.
- 세션은 `app/_session.ts`의 `getUser`(= `cache(getSessionUser)`)로 읽는다. 셸과 본문이
  각자 `@server/auth`를 부르면 인증 서버를 두 번 왕복한다(실측 ~80ms).
  **세션이 필요한 페이지는 `@server/auth`가 아니라 `getUser`를 부른다.**
- ⚠️ 셸이 세션 쿠키를 읽으므로 **셸을 쓰는 페이지는 전부 동적**이다. 다른 동적 API를 쓰지
  않는 화면(약관·방침·소개·주간·언론사·탈퇴·auth)은 `dynamic = "force-dynamic"`을 스스로
  선언해야 한다 — 라우트 세그먼트 설정은 page/layout 파일에서만 읽히므로 셸이 대신 못 한다.

## 헤더 — 주요 메뉴는 머리에 둔다

헤더 마크업은 `widgets/site-header` 한 곳에 있다. 세션은 셸이 읽어 props로 내려준다
(위젯은 `server/`를 만지지 않는다).

- **주간 리포트·언론사는 헤더의 주요 메뉴다**(2026-09-07에 푸터에서 올렸다). 홈은 날짜별
  목록이라 이 둘은 **다른 축의 읽을거리**인데, 지면 바닥에 두면 존재 자체가 발견되지 않는다.
  푸터에는 지면이 아니라 지면에 대한 고지(약관·방침·문의)만 남긴다.
- **"← 홈" 백링크를 두지 않는다.** 브랜드 락업(로고+워드마크)이 홈 링크다. 백링크는 돌아갈
  곳이 홈이 아닐 때만 세운다 — 그날 목록·언론사 허브·관리.
- 헤더는 **320px에서도 한 줄**이어야 한다. 백링크가 있는 화면은 그 폭에서 워드마크를
  시각적으로만 감춘다(`display: none`으로 지우면 h1이 접근성 트리에서 사라진다).
  메뉴를 배경 칩으로 만들면 좌우 패딩만 30px을 먹어 이 줄이 깨진다 → 맨 텍스트로 둔다.
  `e2e/navigation.spec.ts`가 이 폭을 지킨다.

## 지면 여백과 푸터

`shared/styles/layout.css.ts`에는 **공용 지면 규칙만** 둔다 — `page` · `gutters` ·
`container` · `prose` 넷. 헤더·푸터 전용 스타일은 각 위젯 옆에 있다.

- 좌우 여백은 `gutters` 하나에서 나온다(`GUTTER` 18 / 28 / 36px + `maxWidth` 64rem).
  헤더(`site-header`)·본문(`container`)·푸터(`site-footer`)가 **이 스타일을 합성해** 쓰므로
  값이 갈릴 수 없다. 세로 여백만 합성하는 쪽이 정한다(shorthand 충돌을 피해 가로만 둔다).
- **페이지 본문은 반드시 `layout.container` 안에 둔다** — 이제 셸이 보장한다. 예전엔
  클러스터 상세가 이걸 빼먹어 혼자 full-bleed로 렌더됐다(#21에서 수정).
- **읽는 글은 컨테이너째 좁히지 않는다.** `maxWidth`를 760으로 덮으면 상자가 가운데로 다시
  정렬돼 글이 헤더의 세로줄보다 오른쪽에서 시작한다. `container` **안에** `prose`(760px)를
  두어 왼쪽 끝은 브랜드 락업과 같은 자리에 두고 오른쪽으로만 덜 뻗게 한다.
  `e2e/navigation.spec.ts`가 세 페이지의 이 정렬을 지킨다.
- 푸터는 `widgets/site-footer`이고 root layout(`app/layout.tsx`)이 세운다 — 셸이 아니라
  루트에 두는 이유는 셸을 쓰지 않는 상태 화면(error·not-found·loading)에도 떠야 해서다.
  `body`가 flex column이고 `layout.page`(및 `status.css`의 `root`)가 `flex: 1 0 auto`라
  내용이 짧아도 푸터가 화면 아래에 붙는다 — `minHeight: 100vh`로 두면 빈 화면을 한 번
  스크롤해야 푸터가 나온다.
