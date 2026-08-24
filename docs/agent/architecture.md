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
          └─ 트랜잭션: 해당 날짜 클러스터 삭제 → 재생성 → 기사 배정  ⇒ 멱등
              │
              └─▶ server/queries/*  — 순수 Prisma 조회 (커서 페이지네이션/집계)
                    └─▶ API 라우트 (src/app/api/**)  — 파라미터 파싱 + 도메인 매핑
                          └─▶ 클라이언트 (react-query)  — 무한 스크롤 피드 / 상세는 서버 컴포넌트가 server/queries 직접 호출
```

클러스터링 단위는 **KST 기준 하루**이고 날짜 간 격리다. 어제 23:50과 오늘 00:10이 같은
사건이어도 다른 클러스터가 된다. 설계 근거는 [daily-clustering.md](./daily-clustering.md).

## 디렉토리 역할

| 경로                              | 역할                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `server/db.ts`                    | Prisma 싱글턴. 전체 BE에서 이것만 import                                           |
| `server/auth.ts`                  | Neon Auth 인스턴스 + 세션 래퍼. **SDK 의존을 여기로 격리** → [auth.md](./auth.md)  |
| `server/session-cookie.ts`        | 세션 쿠키 존재 판정(순수 함수). 왕복 단축 → [caching.md](./caching.md)             |
| `server/cache.ts`                 | 캐시 수명 상수. 캐싱은 DTO 경계에서 → [caching.md](./caching.md)                   |
| `server/github.ts`                | `workflow_dispatch` 호출 (관리자 수동 트리거)                                      |
| `server/queries/clusters.ts`      | 클러스터 조회(커서 페이지네이션·상세·집계). 순수 Prisma                            |
| `server/clustering/embed.ts`      | OpenAI text-embedding-3-small 배치 호출 (100건/req, 5-retry, 431 방어)             |
| `server/clustering/similarity.ts` | 내적·코사인 유사도 순수 함수                                                       |
| `server/clustering/vector.ts`     | 임베딩 Float32 bytes 인코딩·정규화·centroid                                        |
| `server/clustering/bucket.ts`     | KST 날짜 버킷 변환 (`toBucketDate` 등)                                             |
| `server/clustering/hac.ts`        | 응집 클러스터링 (average linkage, 순수 함수)                                       |
| `server/clustering/daily.ts`      | 일별 배치 오케스트레이션 (`clusterDay`, threshold 0.62)                            |
| `server/clustering/llm-judge.ts`  | LLM 판정. **현재 미사용** (재도입 여부 검토 중)                                    |
| `scripts/collect.ts`              | RSS 수집 → Article 직접 적재. `pubDate`/`dc:date` → [rss-feeds.md](./rss-feeds.md) |
| `scripts/cluster-day.ts`          | 하루치 클러스터링 실행 (`--date`/`--from..--to`/`--all`/`--dry-run`)               |
| `prisma/schema.prisma`            | Outlet / Cluster / Article 모델                                                    |
| `src/`                            | FSD 구조 Next.js 앱 (아래 별도 설명)                                               |

## FSD 레이어 (src/)

```
shared/          — 프레임워크 무관 유틸 / 스타일
  lib/           — format.ts, bucket-date.ts, theme.ts(테마 저장·구독), useInfiniteScroll.ts
  styles/        — theme.css.ts(토큰·라이트/다크), layout.css.ts
  ui/            — Logo, Skeleton, icons, ThemeScript(FOUC 방지)
entities/        — 도메인 모델 + dumb UI
  outlet/        — model.ts, ui/, index.ts
  article/       — model.ts, index.ts
  cluster/       — model.ts, lib.ts(row→DTO 매핑), api.ts(클라이언트 fetcher), ui/, index.ts
  comment/       — model.ts, lib.ts(canDelete 계산), api.ts, index.ts
features/        — 사용자 인터랙션 (상태 가능)
  outlet-filter/ — model.ts(parseOutletParam), ui/, index.ts
  profile-menu/  — ui/(ProfileMenu) — 테마·로그인·관리·탈퇴를 한 드롭다운에
  date-nav/      — model.ts(parseDateParam·datePath), ui/(DateNav), index.ts
  auth-form/     — model.ts(AuthFormState), ui/(AuthForm), index.ts
widgets/         — 페이지 조각 (여러 entity 조합)
  cluster-feed/
  cluster-detail/
  cluster-comments/
app/             — Next.js App Router
  page.tsx       — 홈. 최신 날짜를 직접 렌더(리다이렉트하지 않는다)
  d/[date]/      — 날짜별 목록 (YYYY-MM-DD)
  clusters/[id]/ — 클러스터 상세
  auth/          — sign-in · sign-up · actions.ts (Server Action)
  account/       — delete(회원 탈퇴). /auth 레이아웃 밖에 둔다(로그인 상태에서 쓰는 화면)
  terms/         — 이용약관
  error.tsx · loading.tsx · not-found.tsx — 상태 화면
  admin/         — 관리자 전용. 수집·클러스터링 트리거 · comments(댓글 관리) · blocked(저작권 차단)
  api/           — clusters · clusters/[id] · clusters/stats · days · comments · auth/[...path]
proxy.ts         — 라우트 보호. Next 16에서 middleware.ts가 이 이름으로 바뀌었다
```

**레이어 의존 방향:** `app → widgets → features → entities → shared` (단방향)

- `server/` import는 API 라우트(`src/app/api/**`)와 서버 컴포넌트만. entities/widgets/features는 `entities/*/api.ts` 클라이언트 fetcher로 HTTP 호출 (DB 직접 접근 금지)
- `features/`는 상태·인터랙션 허용(entities의 `ui/` dumb 규칙과 다름). 필터·정렬 등도 여기에 추가
