import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  display: "flex",
  gap: 8,
});

const badgeBase = style({
  borderRadius: vars.radius.full,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 500,
});

export const badge = styleVariants({
  conservative: [
    badgeBase,
    { background: vars.color.badgeConservativeBg, color: vars.color.badgeConservativeFg },
  ],
  neutral: [badgeBase, { background: vars.color.badgeNeutralBg, color: vars.color.badgeNeutralFg }],
  progressive: [
    badgeBase,
    { background: vars.color.badgeProgressiveBg, color: vars.color.badgeProgressiveFg },
  ],
});
