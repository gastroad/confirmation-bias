import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/**
 * 크기는 정하지 않는다 — 이 라벨이 놓이는 줄(카드 메타·리포트 행)이 정한다.
 * 색은 인라인으로 온다(TILT_COLORS). 데이터에서 나오는 값이라 토큰을 가리킬 뿐이다.
 */
export const root = style({
  fontFamily: vars.font.sans,
  fontWeight: 500,
});
