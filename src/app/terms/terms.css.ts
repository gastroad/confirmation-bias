import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const article = style({
  width: "100%",
  maxWidth: 760,
  margin: "0 auto",
  padding: "32px 16px 64px",
  color: vars.color.text,
  lineHeight: 1.7,
});

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
});

export const lead = style({
  fontSize: 15,
  color: vars.color.textSecondary,
  marginBottom: 32,
});

export const section = style({
  marginTop: 32,
});

export const heading = style({
  fontSize: 18,
  fontWeight: 650,
  letterSpacing: "-0.01em",
  marginBottom: 10,
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
  gap: 6,
  marginBottom: 12,
});

export const link = style({
  color: vars.color.accent,
  textUnderlineOffset: 2,
  selectors: {
    "&:hover": { textDecoration: "underline" },
  },
});
