import { style, styleVariants, keyframes } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/** 레인 이름·첫 보도 시각이 앉는 왼쪽 열. 트랙·눈금·격자가 모두 이 값에서 시작한다. */
const LABEL_WIDTH = 52;

const pop = keyframes({
  from: { opacity: 0, transform: "translate(-50%, -50%) scale(0.3)" },
  to: { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
});

export const note = style({
  fontSize: 12,
  lineHeight: 1.6,
  color: vars.color.textFaint,
  fontVariantNumeric: "tabular-nums",
  // 머리(heading)에 붙여 읽히도록 section의 gap을 되돌린다.
  marginTop: -6,
});

export const noteLead = style({
  fontWeight: 500,
  color: vars.color.textMuted,
});

export const strip = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: "14px 16px 10px",
});

export const body = style({
  position: "relative",
});

/** 3시간마다 세로 눈금(24시간 / 12.5%). 점 하나가 몇 시쯤인지 축까지 내려가지 않아도 읽힌다. */
export const grid = style({
  position: "absolute",
  left: LABEL_WIDTH,
  right: 0,
  top: 0,
  bottom: 0,
  pointerEvents: "none",
  background: `repeating-linear-gradient(to right, ${vars.color.chartGrid} 0 1px, transparent 1px 12.5%)`,
});

export const lane = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: `${LABEL_WIDTH}px 1fr`,
  alignItems: "center",
  height: 36,
  selectors: {
    "& + &": { borderTop: `1px solid ${vars.color.border}` },
  },
});

export const laneLabel = style({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  paddingRight: 8,
});

export const laneName = style({
  fontSize: 11.5,
  fontWeight: 500,
  color: vars.color.textMuted,
});

const laneTimeBase = style({
  fontFamily: vars.font.mono,
  fontSize: 10.5,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
});

/** 가장 먼저 쓴 진영의 시각만 잉크를 올린다. 어디가 기준점인지가 이 화면의 주장이다. */
export const laneTime = styleVariants({
  follower: [laneTimeBase],
  lead: [laneTimeBase, { color: vars.color.text, fontWeight: 500 }],
});

export const laneTrack = style({
  position: "relative",
  height: "100%",
});

const dotBase = style({
  position: "absolute",
  top: "50%",
  width: 9,
  height: 9,
  borderRadius: vars.radius.full,
  transform: "translate(-50%, -50%)",
  // 겹친 점의 개수가 읽히도록 지면색 테두리를 두른다 — 지터를 주지 않는 대신이다.
  boxShadow: `0 0 0 1.5px ${vars.color.surface}`,
  animationName: pop,
  animationDuration: "0.4s",
  animationTimingFunction: "cubic-bezier(0.22, 0.9, 0.3, 1)",
  animationFillMode: "both",
  selectors: {
    "&:hover": { transform: "translate(-50%, -50%) scale(1.4)", zIndex: 3 },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { animationName: "none" },
  },
});

export const dot = styleVariants({
  follower: [dotBase],
  first: [
    dotBase,
    { boxShadow: `0 0 0 1.5px ${vars.color.surface}, 0 0 0 3px ${vars.color.text}` },
  ],
});

export const laneEmpty = style({
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  fontFamily: vars.font.mono,
  fontSize: 10.5,
  color: vars.color.textFaint,
});

export const axis = style({
  position: "relative",
  height: 16,
  marginLeft: LABEL_WIDTH,
  marginTop: 6,
});

export const tick = style({
  position: "absolute",
  top: 0,
  fontFamily: vars.font.mono,
  fontSize: 10.5,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
  whiteSpace: "nowrap",
});
