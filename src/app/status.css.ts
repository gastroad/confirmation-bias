import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

// error / not-found / loading 이 공유하는 상태 화면 스타일.
export const root = style({
  // layout.page와 같은 이유로 남은 높이를 먹는다 — 푸터가 화면 아래에 붙는다.
  flex: "1 0 auto",
  minHeight: "60vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: "48px 16px",
  textAlign: "center",
});

export const code = style({
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: vars.color.textFaint,
  fontFamily: vars.font.mono,
});

export const title = style({
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: vars.color.text,
});

export const message = style({
  fontSize: 14,
  lineHeight: 1.6,
  color: vars.color.textMuted,
  maxWidth: 420,
});

export const actions = style({
  display: "flex",
  gap: 8,
  marginTop: 8,
  flexWrap: "wrap",
  justifyContent: "center",
});

export const primary = style({
  borderRadius: vars.radius.md,
  border: "none",
  background: vars.color.accent,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: vars.font.sans,
  color: vars.color.accentFg,
  cursor: "pointer",
  selectors: { "&:hover": { opacity: 0.9 } },
});

export const secondary = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 500,
  color: vars.color.textSecondary,
  selectors: {
    "&:hover": { background: vars.color.surfaceHover, color: vars.color.text },
  },
});

export const digest = style({
  marginTop: 4,
  fontSize: 11,
  fontFamily: vars.font.mono,
  color: vars.color.textFaint,
});

// --- loading skeleton ---
export const skeletonWrap = style({
  width: "100%",
  maxWidth: vars.layout.maxWidth,
  margin: "0 auto",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
});
