import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

/**
 * 지면의 좌우 여백. 헤더·본문·푸터가 **같은 값**을 써야 세로줄이 맞는다.
 * 넓은 화면에서 maxWidth에 닿기 전까지는 이 값이 유일한 여백이라, 하나로 고정하면
 * 태블릿~좁은 데스크톱 폭에서 카드가 뷰포트에 꽉 차 답답해진다.
 */
const GUTTER = 18;
const GUTTER_MD = 28;
const GUTTER_LG = 36;

const gutterMedia = {
  "screen and (min-width: 600px)": { paddingLeft: GUTTER_MD, paddingRight: GUTTER_MD },
  "screen and (min-width: 960px)": { paddingLeft: GUTTER_LG, paddingRight: GUTTER_LG },
};

/**
 * body가 flex column이므로 지면이 남은 높이를 먹는다(= sticky footer).
 * `minHeight: 100vh`로 두면 내용이 짧은 페이지(클러스터 상세 등)에서 푸터가
 * 한 화면 아래로 밀려, 빈 화면을 한 번 스크롤해야 나타난다.
 * `1 0 auto` — 늘어나되 내용보다 줄지는 않는다.
 */
export const page = style({
  flex: "1 0 auto",
  width: "100%",
  background: vars.color.bg,
});

export const header = style({
  position: "sticky",
  top: 0,
  zIndex: 10,
  borderBottom: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
});

export const headerInner = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: `16px ${GUTTER}px`,
  display: "flex",
  alignItems: "center",
  gap: 12,
  "@media": gutterMedia,
});

export const container = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: `30px ${GUTTER}px 24px`,
  display: "flex",
  flexDirection: "column",
  gap: 26,
  "@media": gutterMedia,
});

export const headerActions = style({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 4,
});

export const logo = style({
  color: vars.color.text,
  flexShrink: 0,
});

export const brand = style({
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.text,
});

export const brandSub = style({
  fontSize: 13,
  color: vars.color.textFaint,
  "@media": {
    "screen and (max-width: 600px)": { display: "none" },
  },
});

export const backLink = style({
  fontSize: 14,
  color: vars.color.textFaint,
  transition: "color 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.textSecondary,
    },
  },
});

export const divider = style({
  color: vars.color.textFaint,
});

export const brandSmall = style({
  fontSize: 14,
  fontWeight: 700,
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const footer = style({
  borderTop: `1px solid ${vars.color.border}`,
  background: vars.color.bg,
  marginTop: 56,
});

export const footerInner = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: `24px ${GUTTER}px`,
  "@media": gutterMedia,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  fontSize: 13,
  color: vars.color.textFaint,
});

export const footerLinks = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  marginLeft: "auto",
});

export const footerLink = style({
  color: vars.color.textSecondary,
  textUnderlineOffset: 2,
  transition: "color 0.15s",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      textDecoration: "underline",
    },
  },
});
