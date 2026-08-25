import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

// 카드가 아니라 지면의 머리다. 테두리 없이 배경 위에 그대로 앉힌다.
export const root = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
});

export const center = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const dateLine = style({
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  flexWrap: "wrap",
});

// 이 서비스의 단위는 하루다. 날짜가 곧 페이지의 이름이므로 가장 크게 세운다.
export const date = style({
  fontFamily: vars.font.mono,
  fontSize: "clamp(30px, 7vw, 46px)",
  fontWeight: 500,
  letterSpacing: "-0.045em",
  lineHeight: 1,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.text,
});

export const weekday = style({
  fontSize: 13,
  color: vars.color.textFaint,
});

export const meta = style({
  fontSize: 12.5,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textMuted,
});

export const empty = style({
  fontSize: 13,
  color: vars.color.textFaint,
});

export const arrows = style({
  display: "flex",
  gap: 4,
  flexShrink: 0,
  paddingTop: 4,
});

const arrowBase = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  flexShrink: 0,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
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
