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

/**
 * 지면의 세로줄. 헤더(widgets/site-header)·본문·푸터(widgets/site-footer)가 **이것 하나를
 * 합성해** 좌우가 맞는다. 값을 각자 적으면 셋이 갈려 세로줄이 어긋난다.
 * 세로 여백은 합성하는 쪽이 정한다 — 여기엔 가로만 둔다(shorthand 충돌 방지).
 */
export const gutters = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  paddingLeft: GUTTER,
  paddingRight: GUTTER,
  "@media": gutterMedia,
});

/** 페이지 본문. 모든 화면의 `<main>`이 이걸 쓴다 → app/_shell.tsx */
export const container = style([
  gutters,
  {
    paddingTop: 30,
    paddingBottom: 24,
    display: "flex",
    flexDirection: "column",
    gap: 26,
  },
]);

/**
 * 읽는 글(소개·약관·방침)의 본문 열. `container` **안에** 두고 폭만 줄인다.
 *
 * 컨테이너 자체를 좁히면(maxWidth를 760으로 덮으면) 상자가 가운데로 다시 정렬돼
 * 글이 헤더의 세로줄보다 오른쪽에서 시작한다 — 고치려던 어긋남이 그대로 남는다.
 * 왼쪽 끝은 헤더·푸터와 같은 자리에 두고, 오른쪽으로만 덜 뻗게 한다.
 */
export const prose = style({
  maxWidth: 760,
  lineHeight: 1.7,
});
