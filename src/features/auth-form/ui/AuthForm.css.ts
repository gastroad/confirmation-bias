import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  width: "100%",
  maxWidth: 380,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 20,
});

export const heading = style({
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: vars.color.text,
  textAlign: "center",
});

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const label = style({
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.textMuted,
});

export const input = style({
  width: "100%",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: vars.font.sans,
  color: vars.color.text,
  transition: "border-color 0.15s",
  selectors: {
    "&:focus": {
      outline: "none",
      borderColor: vars.color.accent,
    },
    "&::placeholder": {
      color: vars.color.textFaint,
    },
  },
});

export const submit = style({
  marginTop: 4,
  width: "100%",
  borderRadius: vars.radius.md,
  border: "none",
  background: vars.color.accent,
  padding: "11px 12px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: vars.font.sans,
  color: vars.color.accentFg,
  cursor: "pointer",
  transition: "opacity 0.15s",
  selectors: {
    "&:disabled": {
      opacity: 0.6,
      cursor: "default",
    },
    "&:hover:not(:disabled)": {
      opacity: 0.9,
    },
  },
});

export const error = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.dangerFg}`,
  background: vars.color.dangerBg,
  padding: "9px 12px",
  fontSize: 13,
  color: vars.color.dangerFg,
});

export const footer = style({
  fontSize: 13,
  color: vars.color.textMuted,
  textAlign: "center",
});

export const link = style({
  textDecoration: "underline",
  textUnderlineOffset: 2,
  color: vars.color.accent,
  selectors: {
    "&:hover": { color: vars.color.textSecondary },
  },
});
