import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

export const page = style({
  minHeight: "100vh",
  width: "100%",
  background: vars.color.bg,
});

export const header = style({
  position: "sticky",
  top: 0,
  zIndex: 10,
  borderBottom: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
});

export const headerInner = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
});

export const container = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
});

export const brand = style({
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: vars.color.text,
});

export const brandSub = style({
  fontSize: 14,
  color: vars.color.textFaint,
});

export const backLink = style({
  fontSize: 14,
  color: vars.color.textFaint,
  transition: "color 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.textSecondary,
    },
  },
});

export const divider = style({
  color: vars.color.border,
});

export const brandSmall = style({
  fontSize: 14,
  fontWeight: 700,
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
