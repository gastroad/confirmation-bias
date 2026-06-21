import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const empty = style({
  height: 8,
  borderRadius: vars.radius.sm,
  background: vars.color.surfaceHover,
});

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const bar = style({
  display: "flex",
  height: 12,
  width: "100%",
  overflow: "hidden",
  borderRadius: vars.radius.full,
});

export const labels = style({
  display: "flex",
  flexWrap: "wrap",
  columnGap: 12,
  rowGap: 4,
});

export const labelItem = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  color: vars.color.textMuted,
});

export const dot = style({
  display: "inline-block",
  height: 8,
  width: 8,
  borderRadius: vars.radius.full,
});
