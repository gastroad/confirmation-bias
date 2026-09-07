import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";
import { gutters } from "@/shared/styles/layout.css";

export const header = style({
  position: "sticky",
  top: 0,
  zIndex: 10,
  borderBottom: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
});

// 좌우 여백은 shared/styles/layout.css의 gutters에서 온다. 본문·푸터와 세로줄이 맞아야 한다.
export const inner = style([
  gutters,
  {
    paddingTop: 16,
    paddingBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
]);

export const actions = style({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 4,
});

export const logo = style({
  color: vars.color.text,
  flexShrink: 0,
});

export const brandLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});

/** 홈만 로고와 워드마크를 크게 세운다. */
export const brand = style({
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.text,
});

export const brandSmall = style({
  fontSize: 14,
  fontWeight: 700,
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const brandSub = style({
  fontSize: 13,
  color: vars.color.textFaint,
  "@media": {
    "screen and (max-width: 600px)": { display: "none" },
  },
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
