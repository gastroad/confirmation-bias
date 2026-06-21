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

- `server/`·`scripts/` 등 UI가 아닌 코드.
- 데이터에서 오는 색(예: `LEANING_COLORS[leaning]`)을 요소에 칠하는 경우
  → 그건 테마가 아니므로 그대로 인라인 `style={{ backgroundColor: ... }}`로 둔다.

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

## 완료 확인

- `npx tsc --noEmit` — 토큰 타입 오류 없는지.
- `npm run build` — vanilla-extract Turbopack 플러그인이 정상 추출하는지(빌드가 진짜 검증).
