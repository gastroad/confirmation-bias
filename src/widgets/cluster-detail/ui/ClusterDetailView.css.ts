import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const main = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 32,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const title = style({
  fontSize: 20,
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.4,
  marginBottom: 8,
});

export const summary = style({
  fontSize: 14,
  color: vars.color.textSecondary,
  lineHeight: 1.6,
});

export const meta = style({
  fontSize: 12,
  color: vars.color.textFaint,
  marginTop: 8,
});

export const heading = style({
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.textSecondary,
});

export const statGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
  paddingTop: 4,
});

export const statBox = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: 12,
});

export const statBoxHead = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
});

export const dot = style({
  width: 10,
  height: 10,
  borderRadius: vars.radius.full,
});

export const statBoxLabel = style({
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.textSecondary,
});

export const statBoxValue = style({
  fontSize: 18,
  fontWeight: 700,
  color: vars.color.text,
});

export const statBoxPct = style({
  fontSize: 12,
  color: vars.color.textFaint,
});

export const articleList = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const articleItem = style({
  display: "flex",
  gap: 12,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  padding: 12,
  transition: "border-color 0.15s",
  selectors: {
    "&:hover": {
      borderColor: vars.color.borderHover,
    },
  },
});

export const articleDotWrap = style({
  flexShrink: 0,
  paddingTop: 2,
});

export const articleDot = style({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: vars.radius.full,
  marginTop: 6,
});

export const articleBody = style({
  minWidth: 0,
  flex: 1,
});

export const articleMeta = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 2,
});

export const outletName = style({
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.textMuted,
});

export const outletLeaning = style({
  fontSize: 12,
  color: vars.color.textFaint,
});

export const articleDate = style({
  fontSize: 12,
  color: vars.color.textFaint,
  marginLeft: "auto",
});

export const articleLink = style({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  fontSize: 14,
  color: vars.color.text,
  transition: "color 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.accent,
    },
  },
});

export const articleDesc = style({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  fontSize: 12,
  color: vars.color.textFaint,
  marginTop: 2,
});
