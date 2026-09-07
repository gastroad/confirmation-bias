import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";
import { gutters } from "@/shared/styles/layout.css";

export const footer = style({
  borderTop: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
  marginTop: 56,
});

// 좌우 여백은 shared/styles/layout.css의 gutters에서 온다. 헤더·본문과 세로줄이 맞아야 한다.
export const inner = style([
  gutters,
  {
    paddingTop: 24,
    paddingBottom: 24,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    fontSize: 13,
    color: vars.color.textFaint,
  },
]);

export const links = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  marginLeft: "auto",
});

export const link = style({
  color: vars.color.textSecondary,
  textUnderlineOffset: 2,
  transition: "color 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      textDecoration: "underline",
    },
  },
});
