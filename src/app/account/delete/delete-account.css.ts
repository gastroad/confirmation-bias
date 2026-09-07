import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  width: "100%",
  maxWidth: 420,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const heading = style({
  fontSize: 20,
  fontWeight: 700,
  color: vars.color.text,
});

export const warning = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.dangerFg}`,
  background: vars.color.dangerBg,
  padding: "12px 14px",
  fontSize: 13,
  lineHeight: 1.6,
  color: vars.color.dangerFg,
});

export const list = style({
  margin: "8px 0 0",
  paddingLeft: 18,
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const account = style({
  fontSize: 13,
  color: vars.color.textMuted,
});

export const email = style({
  fontWeight: 600,
  color: vars.color.text,
});

export const confirmLabel = style({
  fontSize: 13,
  color: vars.color.textSecondary,
});

export const input = style({
  width: "100%",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: vars.font.sans,
  color: vars.color.text,
  selectors: {
    "&:focus": { outline: "none", borderColor: vars.color.dangerFg },
  },
});

export const actions = style({
  display: "flex",
  gap: 8,
  marginTop: 4,
});

/** 취소와 탈퇴가 같은 폭으로 선다. 한쪽이 커 보이면 그것만으로 유도가 된다. */
export const action = style({
  flex: 1,
});

export const error = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.dangerFg}`,
  background: vars.color.dangerBg,
  padding: "9px 12px",
  fontSize: 13,
  color: vars.color.dangerFg,
});
