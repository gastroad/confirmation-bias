import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  paddingBottom: 48,
});

export const head = style({
  paddingTop: 28,
  paddingBottom: 20,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.textMuted,
});

export const dot = style({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
});

export const name = style({
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: "-0.025em",
  marginTop: 6,
});

export const domain = style({
  fontFamily: vars.font.mono,
  fontSize: 12.5,
  color: vars.color.textFaint,
  marginTop: 4,
});

export const summary = style({
  fontSize: 15,
  lineHeight: 1.75,
  color: vars.color.textSecondary,
  marginTop: 16,
});

export const section = style({
  marginTop: 32,
});

export const heading = style({
  fontSize: 15,
  fontWeight: 650,
  letterSpacing: "-0.01em",
  marginBottom: 12,
});

export const statGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 1,
  background: vars.color.border,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  "@media": {
    "screen and (max-width: 560px)": { gridTemplateColumns: "repeat(2, 1fr)" },
  },
});

export const stat = style({
  background: vars.color.surface,
  padding: "14px 14px 16px",
});

export const statLabel = style({
  fontSize: 12,
  color: vars.color.textMuted,
});

export const statValue = style({
  fontFamily: vars.font.mono,
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.color.text,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
});

export const statNote = style({
  fontSize: 11.5,
  color: vars.color.textFaint,
  marginTop: 2,
});

/** 함께 다룬 매체. 막대 길이는 최다 매체 기준 비율. */
export const overlapList = style({
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const overlapRow = style({
  display: "grid",
  gridTemplateColumns: "84px 1fr auto",
  gap: 10,
  alignItems: "center",
});

export const overlapName = style({
  fontSize: 13,
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const overlapTrack = style({
  height: 10,
  borderRadius: 2,
  background: vars.color.bg,
  overflow: "hidden",
});

export const overlapFill = style({
  height: "100%",
  borderRadius: 2,
});

export const overlapCount = style({
  fontFamily: vars.font.mono,
  fontSize: 12,
  color: vars.color.textMuted,
  fontVariantNumeric: "tabular-nums",
});

export const issueList = style({
  display: "flex",
  flexDirection: "column",
});

export const issue = style({
  display: "block",
  padding: "12px 0",
  borderBottom: `1px solid ${vars.color.border}`,
  color: "inherit",
  textDecoration: "none",
  selectors: {
    "&:hover": { background: vars.color.surface },
    "&:last-child": { borderBottom: "none" },
  },
});

export const issueTitle = style({
  fontSize: 14.5,
  fontWeight: 550,
  lineHeight: 1.5,
});

export const issueMeta = style({
  fontFamily: vars.font.mono,
  fontSize: 11.5,
  color: vars.color.textFaint,
  marginTop: 3,
  fontVariantNumeric: "tabular-nums",
});

export const empty = style({
  fontSize: 14,
  color: vars.color.textFaint,
  padding: "20px 0",
});
