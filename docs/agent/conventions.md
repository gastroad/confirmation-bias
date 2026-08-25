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
  - 예외: 데이터에서 오는 값(성향 색·막대 위치)은 인라인 `style`로 칠한다. 단 **색 자체는
    토큰이다** — `LEANING_COLORS`(`entities/outlet/leaning-colors.ts`)가 `vars.leaning.*`를 가리킨다.
- 다크모드는 `theme.css.ts`가 토큰을 바꿔 자동 처리. 개별 css에 `@media (prefers-color-scheme)` 쓰지 않는다.

### 유채색 액센트를 두지 않는다 (2026-08-25)

파랑·빨강은 **성향의 의미를 독점한다.** 세 번째 유채색이 들어오면 독자가 매번 "이 색은
성향인가 브랜드인가"를 판단해야 한다. 그래서 `accent`는 잉크색이다.

- 활성 상태(선택된 필터 칩·주요 버튼)는 색이 아니라 **잉크 반전** — `accent` 배경 + `accentFg` 글자.
- 링크는 색이 아니라 **밑줄**로 구분한다. hover에서 색을 죽인다.
- `accent` 위에 얹는 글자색은 반드시 `accentFg`. `"#ffffff"` 하드코딩은 다크에서 흰 글자가
  흰 배경에 얹혀 사라진다.
- 상태 색은 정치 성향과 무관하다 → `dangerBg`/`dangerFg`/`successFg`.
  (구 `badgeConservative*`/`badgeProgressive*`를 이 이름으로 바꿨다. 실제 용도가 에러·성공이었다.)

### 대비 기준: `bg`가 최악의 배경이다

본문·보조 텍스트 토큰은 **라이트/다크 양쪽에서** WCAG AA(4.5:1)를 넘겨야 한다.

- 2026-08-25에 팔레트를 뒤집어 **지면(`bg`)이 카드(`surface`)보다 어둡다**(뉴스프린트 회색 위에
  흰 종이). 따라서 **대비는 `bg` 기준으로 확인한다** — 예전 규칙("`surface` 기준")은 `surface`가
  더 어둡던 시절의 것이라 지금은 반대다.
- `#ebedf0` 위에서 4.5:1을 넘기는 가장 밝은 회색이 대략 `#5d6470`(4.87:1)이라, `textFaint`보다
  흐린 단계를 새로 만들 여지는 없다.
- **recharts 눈금은 `currentColor`를 상속한다.** 축 라벨 색을 명시하지 않으면 데이터 잉크를
  따라가 대비가 모자란다 → `tick={{ fill: vars.color.textMuted }}`.

### 서체

- 본문·제목: `vars.font.sans` (IBM Plex Sans KR). **한글이 섞이면 무조건 sans.**
- `vars.font.mono` (IBM Plex Mono)는 **숫자·날짜·코드 전용.** 한글에 모노를 걸면 자간이
  벌어져 읽기 어렵다. 숫자 정렬이 필요하면 sans + `fontVariantNumeric: "tabular-nums"`.
- 한글 줄바꿈은 `global.css.ts`의 `wordBreak: "keep-all"`이 전역으로 처리한다. 끄지 않는다.

- 자세한 절차는 `/add-styled-ui` 스킬 참고.

## 테스트

- 단위 테스트: `*.test.ts` 파일을 테스트 대상 파일 옆에 위치.
- E2E: `e2e/` 디렉토리.
- `npm run test:unit -- --run` 으로 단위 테스트 실행.
- Server Component는 Vitest로 테스트 불가 → E2E(Playwright)로 커버.
