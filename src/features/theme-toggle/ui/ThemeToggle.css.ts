import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  display: "inline-flex",
  gap: 2,
  padding: 2,
  borderRadius: vars.radius.full,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
});

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  padding: 0,
  border: "none",
  borderRadius: vars.radius.full,
  background: "transparent",
  color: vars.color.textFaint,
  cursor: "pointer",
  transition: "color 0.15s, background 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.textSecondary,
    },
  },
});

export const buttonActive = style([
  button,
  {
    background: vars.color.bg,
    color: vars.color.text,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
  },
]);

export const srOnly = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});
