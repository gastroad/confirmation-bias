import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: 16,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const toggle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  color: vars.color.textMuted,
});

export const title = style({
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const chevron = style({
  color: vars.color.textFaint,
  flexShrink: 0,
  transition: "transform 0.15s",
});

export const chevronOpen = style([chevron, { transform: "rotate(180deg)" }]);

export const clearButton = style({
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 12,
  color: vars.color.accent,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      textDecoration: "underline",
    },
  },
});

export const group = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const groupLabel = style({
  fontSize: 11,
  fontWeight: 500,
  color: vars.color.textFaint,
});

export const chips = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: vars.radius.full,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
  padding: "4px 10px",
  fontSize: 13,
  color: vars.color.textSecondary,
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
  selectors: {
    "&:hover": {
      borderColor: vars.color.borderHover,
    },
  },
});

export const chipActive = style([
  chip,
  {
    borderColor: vars.color.accent,
    color: vars.color.text,
    fontWeight: 500,
  },
]);

export const dot = style({
  width: 8,
  height: 8,
  borderRadius: vars.radius.full,
  flexShrink: 0,
});
