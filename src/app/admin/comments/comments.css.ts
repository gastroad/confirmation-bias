import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const header = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
});

export const title = style({
  fontSize: 16,
  fontWeight: 600,
  color: vars.color.text,
});

export const count = style({
  fontSize: 13,
  color: vars.color.textMuted,
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  listStyle: "none",
  padding: 0,
  margin: 0,
});

export const item = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: "12px 14px",
});

export const meta = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
});

export const author = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.text,
});

export const authorGone = style([author, { color: vars.color.textFaint, fontWeight: 400 }]);

export const time = style({
  fontSize: 12,
  color: vars.color.textFaint,
});

export const body = style({
  fontSize: 14,
  lineHeight: 1.6,
  color: vars.color.textSecondary,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const source = style({
  fontSize: 12,
  color: vars.color.textMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const sourceLink = style({
  textDecoration: "underline",
  textUnderlineOffset: 2,
  color: vars.color.accent,
  selectors: { "&:hover": { color: vars.color.textSecondary } },
});

export const empty = style({
  fontSize: 13,
  color: vars.color.textFaint,
  textAlign: "center",
  padding: "24px 0",
});

export const error = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.dangerFg}`,
  background: vars.color.dangerBg,
  padding: "9px 12px",
  fontSize: 13,
  color: vars.color.dangerFg,
});

/** 더 보기는 목록 아래 가운데. 삭제로 줄이 줄어도 자리가 흔들리지 않는다. */
export const moreAction = style({
  alignSelf: "center",
  marginTop: 4,
});
