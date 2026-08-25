import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const heading = style({
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.text,
});

export const count = style({
  marginLeft: 6,
  fontSize: 13,
  fontWeight: 400,
  color: vars.color.textMuted,
});

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const textarea = style({
  width: "100%",
  minHeight: 84,
  resize: "vertical",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  padding: "10px 12px",
  fontSize: 14,
  lineHeight: 1.5,
  fontFamily: vars.font.sans,
  color: vars.color.text,
  selectors: {
    "&:focus": { outline: "none", borderColor: vars.color.accent },
    "&::placeholder": { color: vars.color.textFaint },
  },
});

export const formFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const counter = style({
  fontSize: 12,
  color: vars.color.textFaint,
});

export const counterOver = style([counter, { color: vars.color.dangerFg }]);

export const submit = style({
  borderRadius: vars.radius.md,
  border: "none",
  background: vars.color.accent,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: vars.font.sans,
  color: vars.color.accentFg,
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "default" },
    "&:hover:not(:disabled)": { opacity: 0.9 },
  },
});

export const signInPrompt = style({
  borderRadius: vars.radius.md,
  border: `1px dashed ${vars.color.border}`,
  padding: "14px 16px",
  fontSize: 13,
  color: vars.color.textMuted,
  textAlign: "center",
});

export const link = style({
  textDecoration: "underline",
  textUnderlineOffset: 2,
  color: vars.color.accent,
  fontWeight: 500,
  selectors: { "&:hover": { color: vars.color.textSecondary } },
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
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

export const itemHead = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
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

export const deleteButton = style({
  marginLeft: "auto",
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 12,
  fontFamily: vars.font.sans,
  color: vars.color.textFaint,
  cursor: "pointer",
  selectors: {
    "&:hover": { color: vars.color.dangerFg },
    "&:disabled": { opacity: 0.5, cursor: "default" },
  },
});

export const body = style({
  fontSize: 14,
  lineHeight: 1.6,
  color: vars.color.textSecondary,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const empty = style({
  fontSize: 13,
  color: vars.color.textFaint,
  textAlign: "center",
  padding: "12px 0",
});

export const error = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.dangerFg}`,
  background: vars.color.dangerBg,
  padding: "9px 12px",
  fontSize: 13,
  color: vars.color.dangerFg,
});
