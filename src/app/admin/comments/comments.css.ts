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

export const deleteButton = style({
  marginLeft: "auto",
  border: "none",
  background: "transparent",
  padding: "2px 6px",
  borderRadius: vars.radius.sm,
  fontSize: 12,
  fontFamily: vars.font.sans,
  color: vars.color.textFaint,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      background: vars.color.dangerBg,
      color: vars.color.dangerFg,
    },
    "&:disabled": { opacity: 0.5, cursor: "default" },
  },
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

export const more = style({
  alignSelf: "center",
  marginTop: 4,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  padding: "8px 18px",
  fontSize: 13,
  fontFamily: vars.font.sans,
  color: vars.color.textSecondary,
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: vars.color.borderHover, color: vars.color.text },
  },
});
