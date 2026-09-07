import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/** 바깥 자리(카드·리포트 행)가 여백과 배경을 정한다. 여기엔 세로 흐름만 둔다. */
export const root = style({
  minWidth: 0,
});

/**
 * 여백을 네 방향 다 적는다. 헤딩 단계가 바깥 목록의 깊이에 따라 h3/h4로 갈리는데
 * `global.css.ts`의 마진 리셋은 h3까지만 덮어, h4면 UA 기본 위쪽 마진 20px이 딸려 온다.
 */
export const title = style({
  margin: "0 0 15px",
  fontSize: 15.5,
  fontWeight: 600,
  letterSpacing: "-0.015em",
  lineHeight: 1.42,
  color: vars.color.text,
  "@media": {
    "screen and (max-width: 600px)": { fontSize: 14.5 },
  },
});

/**
 * 막대 아래 한 줄. 규모(왼쪽)와 편향(오른쪽)이 축을 사이에 두고 마주 본다.
 * 수치를 한쪽 열에 몰면 카드 무게가 그쪽으로 쏠려 중심선이 기울어 보인다.
 */
export const meta = style({
  marginTop: 9,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 11.5,
  color: vars.color.textFaint,
  fontVariantNumeric: "tabular-nums",
});

/** 숫자만 모노로. 행마다 자릿수가 맞아야 규모가 위아래로 비교된다. */
export const num = style({
  fontFamily: vars.font.mono,
  fontStyle: "normal",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.color.textMuted,
});
