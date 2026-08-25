import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/**
 * 카드의 좌우 패딩. 막대 트랙의 폭이 여기서 나온다.
 * 좌우가 대칭이므로 **중심선은 언제나 카드의 50%** 다 — 수치 열이 있던 시절처럼
 * 컨테이너 폭에서 인셋을 빼 맞출 필요가 없다.
 */
const CARD_PAD_X = 14;
const CARD_PAD_X_SM = 12;

export const daySpectrum = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

/**
 * 하루 막대의 트랙을 목록 카드의 막대 트랙과 같은 폭으로 맞춘다.
 * 중심선(50%)은 좌우 대칭이라 어차피 일치하지만, 폭까지 같아야 하루 막대가
 * "아래 이슈들의 합"으로 읽힌다.
 */
export const dayTrack = style({
  paddingLeft: CARD_PAD_X,
  paddingRight: CARD_PAD_X,
  "@media": {
    "screen and (max-width: 600px)": {
      paddingLeft: CARD_PAD_X_SM,
      paddingRight: CARD_PAD_X_SM,
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

export const list = style({
  background: vars.color.surface,
  borderRadius: `0 0 ${vars.radius.lg} ${vars.radius.lg}`,
});

export const card = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  padding: `16px ${CARD_PAD_X}px 14px`,
  borderBottom: `1px solid ${vars.color.border}`,
  transition: "background 0.12s",
  selectors: {
    "&:hover": { background: vars.color.surfaceHover },
    "li:last-child &": { borderBottom: "none" },
  },
  "@media": {
    "screen and (max-width: 600px)": {
      padding: `14px ${CARD_PAD_X_SM}px 12px`,
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

/**
 * 막대 아래 한 줄. 규모(왼쪽)와 편향(오른쪽)이 축을 사이에 두고 마주 본다.
 * 수치를 한쪽 열에 몰면 카드 무게가 오른쪽으로 쏠려 중심선이 기울어 보인다.
 */
export const cardMeta = style({
  marginTop: 9,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  fontVariantNumeric: "tabular-nums",
});

export const cardStat = style({
  fontSize: 11.5,
  color: vars.color.textFaint,
});

/** 숫자만 모노로. 행마다 자릿수가 맞아야 규모가 위아래로 비교된다. */
export const cardNum = style({
  fontFamily: vars.font.mono,
  fontStyle: "normal",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.color.textMuted,
});

export const cardTilt = style({
  fontFamily: vars.font.sans,
  fontSize: 11.5,
  fontWeight: 500,
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
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: `16px ${CARD_PAD_X}px 14px`,
  borderBottom: `1px solid ${vars.color.border}`,
  "@media": {
    "screen and (max-width: 600px)": {
      padding: `14px ${CARD_PAD_X_SM}px 12px`,
    },
  },
});

/**
 * 중심선. 카드 정중앙을 세로로 관통해 위아래 이슈의 막대를 같은 축에서 비교하게 한다.
 * 목록(ul)이 아니라 카드에 거는 이유: hover 배경이 카드 위에 깔리므로 목록에 걸면
 * 커서가 얹힌 줄만 축이 끊긴다. 카드의 ::before는 배경 위·막대 아래에 놓인다.
 */
globalStyle(`${card}::before, ${skeletonCard}::before`, {
  content: "",
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "50%",
  width: 1,
  background: vars.color.meridian,
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
