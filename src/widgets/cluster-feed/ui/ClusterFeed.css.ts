import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const stats = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  padding: 16,
});

export const statCell = style({
  textAlign: "center",
});

export const statCellDivided = style([
  statCell,
  {
    borderLeft: `1px solid ${vars.color.border}`,
    borderRight: `1px solid ${vars.color.border}`,
  },
]);

export const statValue = style({
  fontSize: 24,
  fontWeight: 700,
  color: vars.color.text,
});

export const statLabel = style({
  fontSize: 12,
  color: vars.color.textMuted,
  marginTop: 2,
});

export const sectionTitle = style({
  fontSize: 12,
  fontWeight: 600,
  color: vars.color.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 12,
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const card = style({
  display: "block",
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  padding: 16,
  transition: "border-color 0.15s, box-shadow 0.15s",
  selectors: {
    "&:hover": {
      borderColor: vars.color.borderHover,
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
    },
  },
});

export const cardHead = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
});

export const cardTitle = style({
  fontSize: 16,
  fontWeight: 500,
  color: vars.color.text,
  lineHeight: 1.4,
});

export const cardTime = style({
  flexShrink: 0,
  fontSize: 12,
  color: vars.color.textFaint,
});

export const cardFooter = style({
  marginTop: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const cardCount = style({
  fontSize: 12,
  color: vars.color.textFaint,
});

export const emptyState = style({
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  padding: 40,
  textAlign: "center",
});

export const emptyTitle = style({
  fontSize: 14,
  color: vars.color.textMuted,
});

export const emptyHint = style({
  fontSize: 12,
  color: vars.color.textFaint,
  marginTop: 4,
});

export const code = style({
  fontFamily: vars.font.mono,
  background: vars.color.surfaceHover,
  padding: "0 4px",
  borderRadius: vars.radius.sm,
});
