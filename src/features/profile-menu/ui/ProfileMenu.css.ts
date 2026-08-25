import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const root = style({
  position: "relative",
});

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: vars.radius.full,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  color: vars.color.textSecondary,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: vars.font.sans,
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
  selectors: {
    "&:hover": { borderColor: vars.color.borderHover, color: vars.color.text },
  },
});

export const triggerSignedIn = style([
  trigger,
  { borderColor: vars.color.accent, color: vars.color.accent },
]);

export const panel = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 20,
  minWidth: 200,
  display: "flex",
  flexDirection: "column",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.control,
  padding: 4,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
});

export const identity = style({
  padding: "8px 10px 6px",
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const identityName = style({
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const identityEmail = style({
  fontSize: 11,
  color: vars.color.textFaint,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const groupLabel = style({
  padding: "6px 10px 4px",
  fontSize: 11,
  fontWeight: 500,
  color: vars.color.textFaint,
});

const rowBase = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  borderRadius: vars.radius.sm,
  border: "none",
  background: "transparent",
  padding: "7px 10px",
  fontSize: 13,
  fontFamily: vars.font.sans,
  textAlign: "left",
  color: vars.color.textSecondary,
  cursor: "pointer",
  transition: "background 0.12s, color 0.12s",
  selectors: {
    "&:hover": { background: vars.color.surfaceHover, color: vars.color.text },
  },
});

export const row = rowBase;

export const rowActive = style([rowBase, { color: vars.color.text, fontWeight: 500 }]);

export const rowDanger = style([
  rowBase,
  {
    color: vars.color.textFaint,
    selectors: {
      "&:hover": {
        background: vars.color.dangerBg,
        color: vars.color.dangerFg,
      },
    },
  },
]);

// 유채색 액센트가 없으므로 강조는 잉크의 진하기·굵기로 낸다.
export const rowAccent = style([rowBase, { color: vars.color.text, fontWeight: 600 }]);

export const check = style({
  marginLeft: "auto",
  color: vars.color.accent,
  flexShrink: 0,
});

export const divider = style({
  height: 1,
  margin: "4px 0",
  background: vars.color.border,
});

export const form = style({
  display: "contents",
});
