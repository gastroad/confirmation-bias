import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const title = style({
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  marginBottom: 8,
});

export const meta = style({
  fontSize: 13,
  color: vars.color.textFaint,
  marginBottom: 28,
  fontFamily: vars.font.mono,
});

export const lead = style({
  fontSize: 16,
  color: vars.color.textSecondary,
  marginBottom: 32,
});

export const section = style({
  marginTop: 36,
});

export const heading = style({
  fontSize: 18,
  fontWeight: 650,
  letterSpacing: "-0.01em",
  marginBottom: 10,
});

export const subheading = style({
  fontSize: 15,
  fontWeight: 600,
  marginTop: 20,
  marginBottom: 6,
});

export const paragraph = style({
  fontSize: 14.5,
  color: vars.color.textSecondary,
  marginBottom: 12,
});

export const list = style({
  fontSize: 14.5,
  color: vars.color.textSecondary,
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 12,
});

export const link = style({
  textDecoration: "underline",
  textUnderlineOffset: 2,
  color: vars.color.accent,
  selectors: {
    "&:hover": { color: vars.color.textSecondary },
  },
});

/** 파이프라인 단계. 번호를 세로로 세워 순서가 읽히게 한다. */
export const steps = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
  marginTop: 14,
});

export const step = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 12,
  alignItems: "baseline",
});

export const stepNum = style({
  fontFamily: vars.font.mono,
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.accentFg,
  background: vars.color.accent,
  borderRadius: vars.radius.sm,
  padding: "2px 7px",
  lineHeight: 1.4,
});

export const stepBody = style({
  fontSize: 14.5,
  color: vars.color.textSecondary,
});

export const stepTitle = style({
  display: "block",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: 2,
});

/** 언론사 성향 표. 진보→중도→보수 순으로 세로로 쌓는다. */
export const outletGroups = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 16,
});

export const outletRow = style({
  display: "grid",
  gridTemplateColumns: "96px 1fr",
  gap: 12,
  alignItems: "baseline",
  paddingBottom: 12,
  borderBottom: `1px solid ${vars.color.border}`,
  selectors: {
    "&:last-child": { borderBottom: "none", paddingBottom: 0 },
  },
  "@media": {
    "screen and (max-width: 480px)": {
      gridTemplateColumns: "1fr",
      gap: 4,
    },
  },
});

export const outletLabel = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.text,
});

export const outletDot = style({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
});

export const outletNames = style({
  fontSize: 14.5,
  color: vars.color.textSecondary,
});

export const note = style({
  fontSize: 13.5,
  color: vars.color.textFaint,
  borderLeft: `2px solid ${vars.color.border}`,
  paddingLeft: 12,
  marginTop: 14,
});

export const mono = style({
  fontFamily: vars.font.mono,
  fontSize: "0.92em",
});

/** 계산 예시 표. 좁은 화면에서는 표만 가로로 밀린다(본문은 스크롤되지 않는다). */
export const tableWrap = style({
  overflowX: "auto",
  marginBottom: 12,
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  color: vars.color.textSecondary,
});

globalStyle(`${table} th, ${table} td`, {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: `1px solid ${vars.color.border}`,
  whiteSpace: "nowrap",
});

globalStyle(`${table} thead th`, {
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.text,
});

globalStyle(`${table} tfoot th, ${table} tfoot td`, {
  fontWeight: 600,
  color: vars.color.text,
  borderBottom: "none",
});

// table 셀 선택자(위)보다 구체적이어야 정렬이 이긴다.
export const num = style({});
globalStyle(`${table} ${num}`, {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
});

export const versions = style({
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 12,
});

export const version = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  fontSize: 14,
  color: vars.color.textSecondary,
  paddingLeft: 12,
  borderLeft: `2px solid ${vars.color.border}`,
});

export const versionHead = style({
  fontSize: 12.5,
  color: vars.color.textFaint,
});
