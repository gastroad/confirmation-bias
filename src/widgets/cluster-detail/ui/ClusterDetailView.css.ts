import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const main = style({
  display: "flex",
  flexDirection: "column",
  gap: 30,
});

export const head = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const subline = style({
  fontSize: 12.5,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
});

export const title = style({
  fontSize: "clamp(23px, 4.2vw, 32px)",
  fontWeight: 700,
  letterSpacing: "-0.035em",
  lineHeight: 1.24,
  textWrap: "balance",
  color: vars.color.text,
});

export const summary = style({
  fontSize: 15,
  lineHeight: 1.65,
  color: vars.color.textSecondary,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export const heading = style({
  fontSize: 11.5,
  fontWeight: 600,
  color: vars.color.textFaint,
});

// 화면이 스스로 무언가를 주장하는 유일한 문장. 분포를 말로 옮긴 것이다.
export const verdict = style({
  fontSize: 16,
  lineHeight: 1.6,
  color: vars.color.textSecondary,
  maxWidth: "48ch",
});

globalStyle(`${verdict} b`, {
  fontWeight: 600,
  color: vars.color.text,
});

// 같은 사건을 성향별로 갈라 놓는다. 무엇을 다르게 썼는지가 레이아웃 자체가 된다.
export const columns = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 1,
  background: vars.color.border,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  overflow: "hidden",
  "@media": {
    "screen and (max-width: 720px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const column = style({
  background: vars.color.surface,
  display: "flex",
  flexDirection: "column",
  paddingBottom: 8,
});

export const columnHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
  padding: "11px 13px",
  borderBottom: `1px solid ${vars.color.border}`,
});

export const columnName = style({
  fontSize: 12.5,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: vars.color.text,
});

export const columnCount = style({
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
});

export const article = style({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: "11px 13px 12px",
  borderBottom: `1px solid ${vars.color.border}`,
  selectors: {
    "&:last-of-type": { borderBottom: "none" },
  },
});

export const articleMeta = style({
  display: "flex",
  alignItems: "baseline",
  gap: 7,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
});

/** 시각만 모노로. 기사 사이에서 자릿수가 맞아야 시간 순서가 읽힌다. */
export const articleTime = style({
  fontFamily: vars.font.mono,
  fontSize: 10.5,
  fontVariantNumeric: "tabular-nums",
});

export const outletName = style({
  fontWeight: 500,
  color: vars.color.textMuted,
});

export const articleLink = style({
  fontSize: 13.5,
  fontWeight: 500,
  lineHeight: 1.45,
  letterSpacing: "-0.012em",
  color: vars.color.text,
  textDecoration: "none",
  selectors: {
    "&:hover": { textDecoration: "underline" },
  },
});

export const columnEmpty = style({
  padding: "16px 13px",
  fontSize: 12.5,
  color: vars.color.textFaint,
});

export const chart = style({
  color: vars.color.chartLine,
});
