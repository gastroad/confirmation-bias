import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const intro = style({
  paddingTop: 28,
  paddingBottom: 20,
});

export const title = style({
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: "-0.025em",
});

export const lead = style({
  fontSize: 15,
  lineHeight: 1.75,
  color: vars.color.textSecondary,
  marginTop: 10,
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  borderTop: `1px solid ${vars.color.border}`,
});

export const row = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
  padding: "14px 0",
  borderBottom: `1px solid ${vars.color.border}`,
  color: "inherit",
  textDecoration: "none",
  selectors: {
    "&:hover": { background: vars.color.surface },
  },
});

export const nameLine = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const dot = style({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
});

export const name = style({
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: "-0.01em",
});

export const leaningLabel = style({
  fontSize: 12,
  color: vars.color.textMuted,
});

export const rowMeta = style({
  fontSize: 12.5,
  color: vars.color.textFaint,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
});

export const rowNum = style({
  fontFamily: vars.font.mono,
  color: vars.color.textMuted,
});

export const inactive = style({
  fontSize: 12,
  color: vars.color.textFaint,
});

export const link = style({
  textDecoration: "underline",
  textUnderlineOffset: 2,
  color: vars.color.accent,
  selectors: {
    "&:hover": { color: vars.color.textSecondary },
  },
});
