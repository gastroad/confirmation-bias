import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: 16,
});

export const title = style({
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.text,
});

export const desc = style({
  fontSize: 13,
  color: vars.color.textMuted,
  lineHeight: 1.5,
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const input = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  selectors: {
    "&:focus": { outline: "none", borderColor: vars.color.accent },
  },
});

export const button = style({
  borderRadius: vars.radius.md,
  border: "none",
  background: vars.color.accent,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: vars.font.sans,
  color: "#ffffff",
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.6, cursor: "default" },
    "&:hover:not(:disabled)": { opacity: 0.9 },
  },
});

export const ok = style({
  fontSize: 13,
  color: vars.color.badgeProgressiveFg,
});

export const fail = style({
  fontSize: 13,
  color: vars.color.badgeConservativeFg,
});

export const warning = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.badgeConservativeFg}`,
  background: vars.color.badgeConservativeBg,
  padding: "10px 12px",
  fontSize: 13,
  color: vars.color.badgeConservativeFg,
});
