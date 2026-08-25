import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

const grow = keyframes({
  from: { transform: "scaleX(0)" },
  to: { transform: "scaleX(1)" },
});

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const track = style({
  position: "relative",
  height: 11,
});

export const trackLarge = style([track, { height: 18 }]);

// 막대가 놓이는 레일. 양옆의 빈 자리가 "쓰지 않은 눈금"으로 읽히게 한다.
export const rail = style({
  position: "absolute",
  left: 0,
  right: 0,
  top: "50%",
  height: 1,
  background: vars.color.rail,
});

// 트랙 폭의 절반만 쓴다. 한쪽으로 100% 쏠려도 잘리지 않는 최대 폭이 50%다.
export const bar = style({
  position: "absolute",
  top: 0,
  height: "100%",
  width: "50%",
  display: "flex",
  borderRadius: 2,
  overflow: "hidden",
  // left / transformOrigin은 분포에서 계산되므로 컴포넌트가 인라인으로 넘긴다.
  animationName: grow,
  animationDuration: "0.52s",
  animationTimingFunction: "cubic-bezier(0.16, 0.9, 0.3, 1)",
  animationFillMode: "both",
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
});

export const segment = style({
  height: "100%",
});

export const empty = style({
  height: 11,
  borderRadius: 2,
  background: vars.color.rail,
});

export const labels = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "4px 22px",
  fontSize: 11.5,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
});

export const labelItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export const dot = style({
  width: 7,
  height: 7,
  borderRadius: vars.radius.full,
  flexShrink: 0,
});
