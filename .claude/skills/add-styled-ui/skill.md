---
name: add-styled-ui
description: vanilla-extract로 FSD UI 컴포넌트의 스타일을 작성합니다. 새 컴포넌트 스타일링, 기존 컴포넌트에 스타일 추가·수정 시 사용합니다.
---

# Add Styled UI (vanilla-extract)

이 프로젝트의 스타일링은 **vanilla-extract** 전용입니다(Tailwind 미사용).
모든 색·반경·폰트는 테마 토큰(`vars`)을 통하며, 테마 색을 인라인 style로 직접 쓰지 않는다.

## TRIGGER

- 새 UI 컴포넌트에 스타일을 입힐 때.
- 기존 컴포넌트에 스타일을 추가·수정할 때.

## SKIP

- **버튼.** 새로 만들지 않는다 → `shared/ui`의 `Button` / `buttonClass()` (아래 "이미 있는 것" 참고).
- `server/`·`scripts/` 등 UI가 아닌 코드.
- 데이터에서 오는 색(예: `LEANING_COLORS[leaning]`)을 요소에 칠하는 경우
  → 그건 테마가 아니므로 그대로 인라인 `style={{ backgroundColor: ... }}`로 둔다.

## 이미 있는 것을 먼저 쓴다

스타일을 쓰기 **전에** 아래에 해당하는지 본다. 여기 있는 것을 자기 `*.css.ts`에 다시 정의하면
그 순간 드리프트가 시작된다(버튼이 10개 파일에 흩어졌던 게 이 경로였다).

| 그리려는 것                          | 쓸 것                                                  |
| ------------------------------------ | ------------------------------------------------------ |
| 버튼 (`<button>`)                    | `Button` — `@/shared/ui`                               |
| 버튼처럼 생긴 `<Link>`·`<a>`         | `buttonClass({ variant, size })` — `@/shared/ui`       |
| 로딩 자리표시                        | `Skeleton` — `@/shared/ui`                             |
| 성향 분포 막대                       | `LeaningBar` — `@/entities/outlet`                     |
| 편중 라벨("보수 +20")                | `TiltLabel` — `@/entities/outlet`                      |
| 이슈 목록 항목(제목·막대·수치 한 줄) | `ClusterCard` — `@/entities/cluster`                   |
| 좌우 여백·본문 열                    | `layout.gutters` / `layout.container` / `layout.prose` |

- `Button`의 `variant`는 `primary`·`danger`·`secondary`·`quiet`, `size`는 `xs`·`sm`·`md`·`lg`다.
  → [architecture.md](../../../docs/agent/architecture.md)의 "버튼"
- 이들에 얹어도 되는 것은 **바깥 자리가 정하는 것만**이다 — `alignSelf`·`flex: 1`·`marginTop` 같은
  배치. 색·패딩·글자 크기를 `className`으로 덮기 시작하면 공용이 아니게 된다.
- 모양이 같은데 한 곳만 다르게 해야 한다면, 자기 css를 새로 쓰지 말고 **공용 쪽에 prop을 낸다**
  (`ClusterCard`의 `showDate`·`showTiltUnit`·`headingLevel`이 그렇게 생겼다).

## 절차

1. 컴포넌트 파일 **옆에** 같은 이름의 `*.css.ts`를 만든다.
   예: `Foo.tsx` → `Foo.css.ts`.
2. 토큰을 import 한다.
   ```ts
   import { style, styleVariants, globalStyle } from "@vanilla-extract/css";
   import { vars } from "@/shared/styles/theme.css";
   ```
   - `server/`·`scripts/` 외 `src/` 내부에서는 항상 `@/shared/styles/theme.css` 별칭으로.
   - `shared/styles/` 내부끼리는 상대 경로(`./theme.css`).
3. `style({...})`로 규칙을 만들고 **색·반경·폰트·레이아웃 폭은 `vars`만 사용**한다.
   하드코딩 hex/zinc 값 금지(데이터 색 예외는 위 SKIP 참고).
   - hover 등 상태: `selectors: { "&:hover": { ... } }`.
   - 조합: `style([base, { ...override }])`.
   - 분기형(예: 배지 종류별): `styleVariants({ key: [base, {...}] })`.
4. 컴포넌트에서 `import * as styles from "./Foo.css";` 후 `className={styles.x}`로 붙인다.
   `ui/` 안 컴포넌트는 props만 받는 dumb 컴포넌트 규칙 유지(상태·fetch 금지).
5. 새 토큰이 필요하면 `src/shared/styles/theme.css.ts`의 contract에 키를 추가하고
   `lightColors`·`darkColors` **양쪽 모두** 값을 채운다.

## 다크모드

- 다크모드는 `theme.css.ts`가 `prefers-color-scheme`로 토큰을 바꿔 **자동 처리**된다.
- 개별 `*.css.ts`에 `@media (prefers-color-scheme: dark)`를 쓰지 않는다.
  토큰만 제대로 쓰면 라이트/다크가 같이 따라온다.

## recharts 등 SVG 라이브러리

- SVG presentation **속성**(stroke 등)에는 `var(--...)`가 안 먹는다.
  → 선 색은 `stroke="currentColor"` + 래퍼에 `color: vars.color.chartLine`.
  → 축 텍스트·그리드 선은 `globalStyle(\`${container} .recharts-...\`, { fill/stroke: vars... })`.
- Tooltip의 `contentStyle`/`labelStyle`은 인라인 style(div)이라 `vars`를 그대로 넣어도 된다.

## 헤딩의 마진은 컴포넌트가 소유한다

`global.css.ts`의 마진 리셋은 `h1, h2, h3, p, ul, li`까지만 덮는다. `h4` 이하를 쓰면 UA 기본
위쪽 마진(약 20px)이 딸려 들어온다. 헤딩 단계가 props로 갈리는 컴포넌트는
`margin: "0 0 15px"`처럼 **네 방향을 다 적는다**(`entities/cluster`의 `ClusterCard` 참고).

## 완료 확인

- `npx tsc --noEmit` — 토큰 타입 오류 없는지.
- `npm run build` — vanilla-extract Turbopack 플러그인이 정상 추출하는지(빌드가 진짜 검증).
- 공용 컴포넌트를 건드렸으면 **쓰는 쪽 화면을 실제로 본다.** dev 서버를 띄우고
  `npx playwright test`(실 DB) — 특히 라이트/다크 양쪽. 포트 3000이 이미 물려 있으면 Next가
  3001로 올라가므로 **어느 서버를 보고 있는지 먼저 확인한다**(구 코드를 보고 통과할 수 있다).
