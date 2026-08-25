import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/** 우측 수치 열의 폭과 간격. 중심선 위치가 이 두 값에서 나온다. */
const META_WIDTH = 96;
const META_GAP = 20;
const META_WIDTH_SM = 74;
const META_GAP_SM = 12;

/** 좌측 열의 한가운데 = 중심선. 좌우 패딩이 대칭이라 컨테이너 폭과 무관하게 상수로 떨어진다. */
const MERIDIAN_INSET = (META_WIDTH + META_GAP) / 2;
const MERIDIAN_INSET_SM = (META_WIDTH_SM + META_GAP_SM) / 2;

export const daySpectrum = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

/**
 * 하루 막대의 중심선을 아래 목록의 중심선에 맞춘다.
 * 목록 행은 우측에 수치 열을 두므로 좌측 열의 한가운데가 중심선인데, 하루 막대는
 * 그 열이 없어 그냥 두면 축이 MERIDIAN_INSET 만큼 어긋난다. 축을 공유하는 것이
 * 이 화면의 전부이므로 같은 값만큼 오른쪽을 비운다.
 */
export const dayTrack = style({
  paddingRight: MERIDIAN_INSET * 2,
  "@media": {
    "screen and (max-width: 600px)": {
      paddingRight: MERIDIAN_INSET_SM * 2,
    },
  },
});

export const lede = style({
  fontSize: 16,
  lineHeight: 1.6,
  color: vars.color.textSecondary,
  maxWidth: "46ch",
});

globalStyle(`${lede} b`, {
  fontWeight: 600,
  color: vars.color.text,
});

export const listHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 9,
  borderBottom: `1px solid ${vars.color.border}`,
  fontSize: 11.5,
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",
  color: vars.color.textFaint,
});

// 중심선이 목록 전체를 세로로 관통한다. 이 선이 있어야 위아래 이슈의 막대가 비교된다.
export const list = style({
  position: "relative",
  background: vars.color.surface,
  borderRadius: `0 0 ${vars.radius.lg} ${vars.radius.lg}`,
});

globalStyle(`${list}::before`, {
  content: "",
  position: "absolute",
  top: 0,
  bottom: 0,
  left: `calc(50% - ${MERIDIAN_INSET}px)`,
  width: 1,
  background: vars.color.meridian,
  "@media": {
    "screen and (max-width: 600px)": {
      left: `calc(50% - ${MERIDIAN_INSET_SM}px)`,
    },
  },
});

export const card = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: `1fr ${META_WIDTH}px`,
  gap: META_GAP,
  alignItems: "start",
  padding: "15px 14px",
  borderBottom: `1px solid ${vars.color.border}`,
  transition: "background 0.12s",
  selectors: {
    "&:hover": { background: vars.color.surfaceHover },
    "li:last-child &": { borderBottom: "none" },
  },
  "@media": {
    "screen and (max-width: 600px)": {
      gridTemplateColumns: `1fr ${META_WIDTH_SM}px`,
      gap: META_GAP_SM,
      padding: "14px 10px",
    },
  },
});

export const cardTitle = style({
  fontSize: 15.5,
  fontWeight: 600,
  letterSpacing: "-0.015em",
  lineHeight: 1.42,
  color: vars.color.text,
  marginBottom: 15,
  "@media": {
    "screen and (max-width: 600px)": { fontSize: 14.5 },
  },
});

export const cardMeta = style({
  textAlign: "right",
  display: "flex",
  flexDirection: "column",
  gap: 1,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.32,
  paddingTop: 1,
});

export const cardCount = style({
  fontFamily: vars.font.mono,
  fontSize: 15,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.color.text,
});

export const cardCountUnit = style({
  fontStyle: "normal",
  fontSize: 11,
  color: vars.color.textFaint,
});

export const cardTime = style({
  fontFamily: vars.font.sans,
  fontSize: 11,
  color: vars.color.textFaint,
});

export const cardTilt = style({
  fontFamily: vars.font.sans,
  fontSize: 11,
  fontWeight: 500,
  marginTop: 3,
});

export const emptyState = style({
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: 40,
  textAlign: "center",
});

export const emptyTitle = style({
  fontSize: 14,
  color: vars.color.textMuted,
});

export const emptyHint = style({
  fontSize: 12,
  color: vars.color.textFaint,
  marginTop: 4,
});

export const code = style({
  fontFamily: vars.font.mono,
  background: vars.color.surfaceHover,
  padding: "0 4px",
  borderRadius: vars.radius.sm,
});

export const skeletonCard = style({
  display: "grid",
  gridTemplateColumns: `1fr ${META_WIDTH}px`,
  gap: META_GAP,
  padding: "15px 14px",
  borderBottom: `1px solid ${vars.color.border}`,
  "@media": {
    "screen and (max-width: 600px)": {
      gridTemplateColumns: `1fr ${META_WIDTH_SM}px`,
      gap: META_GAP_SM,
      padding: "14px 10px",
    },
  },
});

export const skeletonBody = style({
  display: "flex",
  flexDirection: "column",
  gap: 15,
});

export const sentinel = style({
  height: 1,
});

export const status = style({
  padding: "16px 0",
  textAlign: "center",
  fontSize: 12.5,
  color: vars.color.textFaint,
});

export const retryButton = style({
  marginTop: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  borderRadius: vars.radius.md,
  padding: "6px 12px",
  fontSize: 13,
  fontFamily: vars.font.sans,
  color: vars.color.text,
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: vars.color.borderHover },
  },
});
