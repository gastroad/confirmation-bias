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
  textDecoration: "underline",
  textUnderlineOffset: 2,
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 12,
  color: vars.color.accent,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      color: vars.color.textSecondary,
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
  background: vars.color.control,
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

// 활성 상태는 유채색이 아니라 잉크 반전으로 표시한다.
// 성향 색(파랑·빨강)이 화면에서 의미를 독점해야 하므로 필터가 그 색을 빌려 쓰지 않는다.
export const chipActive = style([
  chip,
  {
    background: vars.color.accent,
    borderColor: vars.color.accent,
    color: vars.color.accentFg,
    fontWeight: 500,
    selectors: {
      "&:hover": { borderColor: vars.color.accent },
    },
  },
]);

export const dot = style({
  width: 8,
  height: 8,
  borderRadius: vars.radius.full,
  flexShrink: 0,
});
