import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: "12px 8px",
});

const arrowBase = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
});

export const arrow = style([
  arrowBase,
  {
    color: vars.color.textSecondary,
    transition: "border-color 0.15s, color 0.15s",
    selectors: {
      "&:hover": {
        borderColor: vars.color.borderHover,
        color: vars.color.text,
      },
    },
  },
]);

// 이동할 날짜가 없을 때. Link가 아니라 span으로 렌더되므로 pointer-events는 불필요하다.
export const arrowDisabled = style([
  arrowBase,
  {
    color: vars.color.textFaint,
    opacity: 0.4,
  },
]);

export const center = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
});

export const label = style({
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: vars.color.text,
  whiteSpace: "nowrap",
});

export const meta = style({
  fontSize: 12,
  color: vars.color.textMuted,
  whiteSpace: "nowrap",
});

export const empty = style({
  fontSize: 12,
  color: vars.color.textFaint,
});
