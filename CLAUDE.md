# confirmation-bias — Agent Instructions

## Project

한국 언론사 성향별 뉴스 클러스터링 대시보드. 실서비스 운영 예정.
RSS 수집(3시간마다) → KST 하루치 배치 클러스터링(하루 1회) → Next.js 대시보드 표시.

## Quick Rules

- FSD 아키텍처 엄격 적용 (`src/`). 레이어 경계를 절대 역방향으로 넘지 않는다.
  경계는 **`eslint.config.mjs`가 강제한다** — 어기면 lint 에러이고 메시지가 문서를 가리킨다.
- entity끼리는 배럴로 서로 부르지 않는다. 같은 레이어라서 FSD가 금지한다. 불가피하면
  **`@x` 공개 API**로만 연다(`@/entities/outlet/@x/cluster`). → `docs/agent/conventions.md`의 "cross-entity"
- DB 조회 등 BE 로직은 `server/`에만. `server/`를 import할 수 있는 곳은 **API 라우트(`src/app/api/**`)와 서버 컴포넌트**뿐. entities·widgets·features 등 UI/클라이언트 레이어는 `server/`를 import하지 않고 `entities/\*/api.ts`의 클라이언트 fetcher로 HTTP 호출한다.
- 데이터 흐름: 클라이언트(react-query) → API 라우트 → `server/queries` → DB. 클라이언트는 파라미터만 보낸다.
- 새 페이지는 셸(`src/app/_shell.tsx`의 `AppShell`)로 감싸고 **본문만 쓴다.** 세션·헤더·
  `<main>` 컨테이너는 셸이 세운다. 세션이 따로 필요하면 `app/_session.ts`의 `getUser`를
  쓴다(요청당 1회 캐시). → `docs/agent/architecture.md`의 "페이지 셸"
- 인증을 만질 때 `@neondatabase/auth`를 **직접 import하지 않는다.** SDK 의존은 `server/auth.ts`
  한 파일로 가둬 두었다(베타 버전이라 교체 여지를 남긴다). → `docs/agent/auth.md`
- 캐시는 **DTO 경계**에 건다. `server/queries/*`(Prisma row)에 걸면 `unstable_cache`의 JSON
  직렬화로 `Date`가 문자열이 되어 도메인 매핑이 깨진다. → `docs/agent/caching.md`
- 클러스터링을 재실행하면 클러스터 id가 바뀐다. 댓글은 `successorByOldCluster`가 승계한다 —
  `clusterDay`의 트랜잭션 순서(생성 → 이관 → 삭제)를 바꾸지 않는다. → `docs/agent/comments.md`
- 클러스터링(`server/clustering/`)을 만지기 전에 `docs/agent/daily-clustering.md`를 읽는다.
  임계값 근거와 "최대 클러스터 크기는 품질 지표가 아니다"라는 판단 기준이 거기 있다.
- 새 코드를 작성하기 전에 아래 세부 문서를 먼저 읽는다.

## Sub-documents

@docs/agent/architecture.md
@docs/agent/conventions.md
@docs/agent/workflows.md
@docs/agent/infrastructure.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
