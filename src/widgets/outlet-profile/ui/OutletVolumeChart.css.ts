import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  width: "100%",
  // Bar가 fill="currentColor"라 이 색을 상속한다(테마 토큰이 그대로 먹는다).
  color: vars.color.chartLine,
});

export const empty = style({
  fontSize: 14,
  color: vars.color.textFaint,
});

// SVG 속성이 아니라 CSS로 걸어야 다크 모드에서 테마 변수가 실제로 해석된다.
globalStyle(`${container} .recharts-cartesian-axis-tick-value`, {
  fill: vars.color.textMuted,
});

globalStyle(`${container} .recharts-cartesian-grid line`, {
  stroke: vars.color.chartGrid,
});
