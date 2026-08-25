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
  background: vars.color.surface,
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
  padding: "30px 16px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 26,
});

export const headerActions = style({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 4,
});

export const logo = style({
  color: vars.color.text,
  flexShrink: 0,
});

export const brand = style({
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.text,
});

export const brandSub = style({
  fontSize: 13,
  color: vars.color.textFaint,
  "@media": {
    "screen and (max-width: 600px)": { display: "none" },
  },
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
  color: vars.color.textFaint,
});

export const brandSmall = style({
  fontSize: 14,
  fontWeight: 700,
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const footer = style({
  borderTop: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
  marginTop: 56,
});

export const footerInner = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: "24px 16px",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  fontSize: 13,
  color: vars.color.textFaint,
});

export const footerLinks = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  marginLeft: "auto",
});

export const footerLink = style({
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
