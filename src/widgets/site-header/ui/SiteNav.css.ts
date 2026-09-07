import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

/**
 * 좁은 화면(320px)에서도 브랜드·백링크와 한 줄에 들어가야 하므로 배경 칩이 아니라
 * 맨 텍스트다. 칩으로 두면 좌우 패딩만 30px 넘게 먹어 헤더가 줄바꿈된다.
 */
export const nav = style({
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginRight: 10,
});

// 링크는 색이 아니라 밑줄로, 활성은 색이 아니라 잉크의 진하기·굵기로 구분한다.
const itemBase = style({
  padding: "8px 0",
  fontSize: 13,
  whiteSpace: "nowrap",
  color: vars.color.textSecondary,
  textUnderlineOffset: 3,
  transition: "color 0.15s",
  selectors: {
    "&:hover": { color: vars.color.text, textDecoration: "underline" },
  },
});

export const item = itemBase;

export const itemActive = style([itemBase, { color: vars.color.text, fontWeight: 600 }]);
