import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

export const email = style({
  fontSize: 12,
  color: vars.color.textMuted,
  maxWidth: 140,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media": {
    "(max-width: 480px)": { display: "none" },
  },
});

export const link = style({
  fontSize: 13,
  color: vars.color.textSecondary,
  padding: "4px 8px",
  borderRadius: vars.radius.md,
  transition: "color 0.15s, background 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      background: vars.color.surfaceHover,
    },
  },
});

export const adminLink = style([link, { color: vars.color.accent }]);

export const signOutButton = style({
  border: "none",
  background: "transparent",
  padding: "4px 8px",
  borderRadius: vars.radius.md,
  fontSize: 13,
  fontFamily: vars.font.sans,
  color: vars.color.textSecondary,
  cursor: "pointer",
  transition: "color 0.15s, background 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      background: vars.color.surfaceHover,
    },
  },
});
