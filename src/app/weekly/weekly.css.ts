import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const intro = style({
  paddingTop: 28,
  paddingBottom: 8,
});

export const period = style({
  fontFamily: vars.font.mono,
  fontSize: 12.5,
  color: vars.color.textFaint,
  fontVariantNumeric: "tabular-nums",
});

export const title = style({
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: "-0.025em",
  marginTop: 4,
});

export const lead = style({
  fontSize: 15,
  lineHeight: 1.75,
  color: vars.color.textSecondary,
  marginTop: 10,
});

/** 선별 기준을 화면에 그대로 밝힌다. 이 페이지가 하는 주장의 근거다. */
export const criteria = style({
  fontSize: 13.5,
  lineHeight: 1.7,
  color: vars.color.textFaint,
  borderLeft: `2px solid ${vars.color.border}`,
  paddingLeft: 12,
  marginTop: 14,
});

export const section = style({
  marginTop: 36,
});

export const heading = style({
  fontSize: 18,
  fontWeight: 650,
  letterSpacing: "-0.01em",
});

export const sectionNote = style({
  fontSize: 13.5,
  color: vars.color.textMuted,
  marginTop: 4,
  marginBottom: 14,
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  borderTop: `1px solid ${vars.color.border}`,
});

export const item = style({
  display: "grid",
  gridTemplateColumns: "28px 1fr",
  gap: 12,
  padding: "14px 0",
  borderBottom: `1px solid ${vars.color.border}`,
  color: "inherit",
  textDecoration: "none",
  selectors: {
    "&:hover": { background: vars.color.surface },
  },
});

export const rank = style({
  fontFamily: vars.font.mono,
  fontSize: 13,
  color: vars.color.textFaint,
  paddingTop: 2,
  fontVariantNumeric: "tabular-nums",
});

export const itemTitle = style({
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.5,
  letterSpacing: "-0.01em",
});

export const itemBar = style({
  marginTop: 8,
});

export const itemMeta = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  color: vars.color.textMuted,
  marginTop: 6,
  fontVariantNumeric: "tabular-nums",
});

export const itemNum = style({
  fontFamily: vars.font.mono,
  color: vars.color.textSecondary,
});

export const empty = style({
  fontSize: 14,
  color: vars.color.textFaint,
  padding: "24px 0",
});
