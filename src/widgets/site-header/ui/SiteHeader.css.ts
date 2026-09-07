import { style } from "@vanilla-extract/css";

export const brandLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});

/**
 * 백링크가 있는 화면은 좁은 폭에서 로고 마크만 남긴다. 백링크·워드마크·메뉴 셋을
 * 한 줄에 세우면 375px에서 넘친다.
 * `display: none`이 아니라 시각적으로만 감춘다 — h1이 접근성 트리에서 사라지면
 * 모바일에서 이 페이지의 제목이 통째로 없어진다.
 */
export const wordmarkCompact = style({
  "@media": {
    "screen and (max-width: 599px)": {
      position: "absolute",
      width: 1,
      height: 1,
      padding: 0,
      overflow: "hidden",
      clipPath: "inset(50%)",
      whiteSpace: "nowrap",
    },
  },
});
