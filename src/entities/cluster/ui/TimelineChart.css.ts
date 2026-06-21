import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  width: "100%",
  // Line uses stroke="currentColor" so it inherits this themed color.
  color: vars.color.chartLine,
});

export const empty = style({
  fontSize: 14,
  color: vars.color.textFaint,
});

// CSS (not SVG attributes) so the theme vars actually resolve in dark mode.
globalStyle(`${container} .recharts-cartesian-axis-tick-value`, {
  fill: vars.color.textMuted,
});

globalStyle(`${container} .recharts-cartesian-grid line`, {
  stroke: vars.color.chartGrid,
});
