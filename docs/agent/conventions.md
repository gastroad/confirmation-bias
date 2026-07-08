# Conventions

## Import 경로

| 상황                                                | 사용할 alias                        |
| --------------------------------------------------- | ----------------------------------- |
| `src/` 내부에서 `src/` 참조                         | `@/`                                |
| API 라우트(`src/app/api`)·서버 컴포넌트 → `server/` | `@server/`                          |
| `server/` 내부에서 `server/` 참조                   | 상대 경로 (`../db`, `./similarity`) |
| `scripts/`, `prisma/` → `server/`                   | `../server/db` 등 상대 경로         |

**절대 금지:** entities·widgets·features·클라이언트 컴포넌트에서 `server/` 직접 import.
이들은 DB가 필요하면 `entities/*/api.ts`의 클라이언트 fetcher로 API 라우트를 호출한다.

## FSD 엄격 규칙

- 각 레이어는 자신보다 **아래 레이어만** import한다.
- entity가 다른 entity를 import하면 안 된다 (cross-entity 금지).
  - 예외: `entities/cluster/model.ts`가 `OutletMetadata` 타입만 참조하는 것은 허용.
- 레이어 공개 API는 반드시 `index.ts` 배럴을 통해 노출한다.
- `ui/` 폴더 안 컴포넌트는 props만 받는 dumb 컴포넌트. 상태·fetch 금지.

## 데이터 패칭

- 리스트/피드 등 클라이언트 데이터는 **react-query**로 받는다 (`@tanstack/react-query`, Provider는 `src/app/providers.tsx`).
- DB 조회는 `server/queries/*` (순수 Prisma) → API 라우트가 파라미터 파싱 + 도메인 매핑(`entities/*/lib.ts`) → JSON.
- 클라이언트 fetcher는 `entities/*/api.ts`. URL 파라미터만 실어 보낸다.
- 목록은 커서 페이지네이션 + 무한 스크롤(IntersectionObserver). 로딩 중엔 스켈레톤.

## 파일 생성 위치 결정 기준

| 추가할 것                    | 어디에                                   |
| ---------------------------- | ---------------------------------------- |
| 새 도메인 타입               | `src/entities/<name>/model.ts`           |
| 새 도메인 UI (props-only)    | `src/entities/<name>/ui/<Component>.tsx` |
| 페이지 수준 UI 조합          | `src/widgets/<name>/ui/<Widget>.tsx`     |
| 날짜·문자열 유틸             | `src/shared/lib/`                        |
| DB 쿼리 (순수 Prisma)        | `server/queries/<name>.ts`               |
| row→DTO 도메인 매핑          | `src/entities/<name>/lib.ts`             |
| 클라이언트 fetcher           | `src/entities/<name>/api.ts`             |
| BE 파이프라인 로직           | `server/clustering/`                     |
| 일회성 실행 스크립트         | `scripts/`                               |
| 사이트 전역 상수(SEO·브랜드) | `src/shared/config/site.ts`              |
| 구조화 데이터·JSON-LD        | `src/shared/seo/`                        |

## 코드 스타일

- TypeScript 전용. `any` 사용 금지.
- 주석은 WHY가 비명백할 때만. WHAT 설명 주석 금지.
- 함수/변수명이 충분히 설명적이면 JSDoc 불필요.
- Prettier 설정 (`.prettierrc`): semi, double quote, tabWidth 2, trailingComma es5, printWidth 100.

## 스타일링

- 스타일은 **vanilla-extract** 전용. 컴포넌트 옆 `*.css.ts`에 작성하고 `import * as styles`로 사용.
- 색·반경·폰트·레이아웃 폭은 반드시 테마 토큰(`@/shared/styles/theme.css`의 `vars`)으로. 하드코딩 금지.
  - 예외: 데이터에서 오는 색(`LEANING_COLORS` 등)은 인라인 `style`로 칠한다.
- 다크모드는 `theme.css.ts`가 토큰을 바꿔 자동 처리. 개별 css에 `@media (prefers-color-scheme)` 쓰지 않는다.
- 자세한 절차는 `/add-styled-ui` 스킬 참고.

## 테스트

- 단위 테스트: `*.test.ts` 파일을 테스트 대상 파일 옆에 위치.
- E2E: `e2e/` 디렉토리.
- `npm run test:unit -- --run` 으로 단위 테스트 실행.
- Server Component는 Vitest로 테스트 불가 → E2E(Playwright)로 커버.
