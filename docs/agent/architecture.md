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
              │
              └─▶ server/queries/*  — 순수 Prisma 조회 (커서 페이지네이션/집계)
                    └─▶ API 라우트 (src/app/api/**)  — 파라미터 파싱 + 도메인 매핑
                          └─▶ 클라이언트 (react-query)  — 무한 스크롤 피드 / 상세는 서버 컴포넌트가 server/queries 직접 호출
```

클러스터링 단위는 **KST 기준 하루**이고 날짜 간 격리다. 어제 23:50과 오늘 00:10이 같은
사건이어도 다른 클러스터가 된다. 설계 근거는 [daily-clustering.md](./daily-clustering.md).

## 디렉토리 역할

| 경로                              | 역할                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `server/db.ts`                    | Prisma 싱글턴. 전체 BE에서 이것만 import                                             |
| `server/auth.ts`                  | Neon Auth 인스턴스 + 세션 래퍼. **SDK 의존을 여기로 격리** → [auth.md](./auth.md)    |
| `server/session-cookie.ts`        | 세션 쿠키 존재 판정(순수 함수). 왕복 단축 → [caching.md](./caching.md)               |
| `server/cache.ts`                 | 캐시 수명 상수. 캐싱은 DTO 경계에서 → [caching.md](./caching.md)                     |
| `server/github.ts`                | `workflow_dispatch` 호출 (관리자 수동 트리거)                                        |
| `server/queries/clusters.ts`      | 클러스터 조회(커서 페이지네이션·상세·집계). 순수 Prisma                              |
| `server/clustering/embed.ts`      | OpenAI text-embedding-3-small 배치 호출 (100건/req, 5-retry, 431 방어)               |
| `server/clustering/similarity.ts` | 내적·코사인 유사도 순수 함수                                                         |
| `server/clustering/vector.ts`     | 임베딩 Float32 bytes 인코딩·정규화·centroid                                          |
| `server/clustering/bucket.ts`     | KST 날짜 버킷 변환 (`toBucketDate` 등)                                               |
| `server/clustering/hac.ts`        | 응집 클러스터링 (average linkage, 순수 함수)                                         |
| `server/clustering/daily.ts`      | 일별 배치 오케스트레이션 (`clusterDay`, threshold 0.62)                              |
| `server/clustering/summary.ts`    | 클러스터 요약 문장 생성 (보도 편중·침묵한 진영·보도 시차). **LLM 미사용, 순수 함수** |
| `server/clustering/llm-judge.ts`  | LLM 판정. **현재 미사용** (재도입 여부 검토 중)                                      |
| `scripts/collect.ts`              | RSS 수집 → Article 직접 적재. `pubDate`/`dc:date` → [rss-feeds.md](./rss-feeds.md)   |
| `scripts/cluster-day.ts`          | 하루치 클러스터링 실행 (`--date`/`--from..--to`/`--all`/`--dry-run`)                 |
| `scripts/cleanup-dirty-dates.ts`  | RSS `pubDate` 이상치로 생긴 과거 버킷 정리 (일회성, `--dry-run`)                     |
| `scripts/backfill-summary.ts`     | 기존 클러스터에 `summary`만 UPDATE. **클러스터를 재생성하지 않는다**                 |
| `prisma/schema.prisma`            | Outlet / Cluster / Article 모델                                                      |
| `src/`                            | FSD 구조 Next.js 앱 (아래 별도 설명)                                                 |

## FSD 레이어 (src/)

```
shared/          — 프레임워크 무관 유틸 / 스타일
  lib/           — format.ts, bucket-date.ts, theme.ts(테마 저장·구독), useInfiniteScroll.ts
  styles/        — theme.css.ts(토큰·라이트/다크), layout.css.ts
  ui/            — Logo, Skeleton, icons, ThemeScript(FOUC 방지), AdSenseLoader(콘텐츠 페이지 전용)
entities/        — 도메인 모델 + dumb UI
  outlet/        — model.ts(순수·css 무의존), lib.ts(집계 DTO·요약 문장), leaning-colors.ts, ui/, index.ts
  article/       — model.ts, index.ts
  cluster/       — model.ts(+색인 기준), lib.ts(DTO 매핑·색인 판정·선별 규칙), api.ts, ui/, index.ts
  comment/       — model.ts, lib.ts(canDelete 계산), api.ts, index.ts
features/        — 사용자 인터랙션 (상태 가능)
  outlet-filter/ — model.ts(parseOutletParam), ui/, index.ts
  profile-menu/  — ui/(ProfileMenu) — 테마·로그인·관리·탈퇴를 한 드롭다운에
  date-nav/      — model.ts(parseDateParam·datePath), ui/(DateNav — 날짜를 크게 세우는 지면 머리), index.ts
  auth-form/     — model.ts(AuthFormState), ui/(AuthForm), index.ts
widgets/         — 페이지 조각 (여러 entity 조합)
  cluster-feed/
  cluster-detail/
  cluster-comments/
  outlet-profile/  — 언론사 페이지 본문(통계·추이 차트·중복 매체·최근 이슈)
app/             — Next.js App Router
  page.tsx       — 홈. 최신 날짜를 직접 렌더(리다이렉트하지 않는다)
  d/[date]/      — 날짜별 목록 (YYYY-MM-DD)
  clusters/[id]/ — 클러스터 상세
  auth/          — sign-in · sign-up · actions.ts (Server Action)
  account/       — delete(회원 탈퇴). /auth 레이아웃 밖에 둔다(로그인 상태에서 쓰는 화면)
  terms/         — 이용약관
  about/         — 소개 및 방법론. 성향 분류 근거·클러스터링 방식·**한계 고지**
  outlets/       — 언론사 허브 + `[id]` 상세. `_data.ts`가 집계를 6시간 캐시
  weekly/        — 주간 리포트(선별 게재). 선별 규칙은 `entities/cluster`에, 화면에도 그대로 노출
  error.tsx · loading.tsx · not-found.tsx — 상태 화면
  admin/         — 관리자 전용. 수집·클러스터링 트리거 · comments(댓글 관리) · blocked(저작권 차단)
  api/           — clusters · clusters/[id] · clusters/stats · days · comments · auth/[...path]
proxy.ts         — 라우트 보호. Next 16에서 middleware.ts가 이 이름으로 바뀌었다
```

**레이어 의존 방향:** `app → widgets → features → entities → shared` (단방향)

- `server/` import는 API 라우트(`src/app/api/**`)와 서버 컴포넌트만. entities/widgets/features는 `entities/*/api.ts` 클라이언트 fetcher로 HTTP 호출 (DB 직접 접근 금지)
- `features/`는 상태·인터랙션 허용(entities의 `ui/` dumb 규칙과 다름). 필터·정렬 등도 여기에 추가

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

편향 수치는 `calcTilt`(진보% − 보수%)이고, `TILT_BALANCE_THRESHOLD`(±5%p) 안이면 "균형"으로
본다. 이 임계값은 디자인이 아니라 **서비스의 주장**이라 화면(목록 헤더)에 그대로 노출한다.

## 지면 여백과 푸터

- 좌우 여백은 `layout.css.ts`의 `GUTTER`(18 / 28 / 36px) 하나에서 나오고 `headerInner`·
  `container`·`footerInner`가 **같은 값**을 쓴다. 셋이 갈리면 헤더·본문·푸터의 세로줄이 어긋난다.
  넓은 화면에서 `maxWidth`(64rem)에 닿기 전까지는 이 값이 유일한 여백이다.
- **페이지 본문은 반드시 `layout.container` 안에 둔다.** 클러스터 상세가 이걸 빼먹어 혼자
  full-bleed로 렌더됐다(#21에서 수정). 상세와 댓글은 같은 `container`를 공유한다.
- 푸터는 root layout(`app/layout.tsx`)에 있어 모든 페이지에 뜬다. `body`가 flex column이고
  `layout.page`(및 `status.css`의 `root`)가 `flex: 1 0 auto`라 내용이 짧아도 푸터가 화면
  아래에 붙는다 — `minHeight: 100vh`로 두면 빈 화면을 한 번 스크롤해야 푸터가 나온다.
