import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

const shimmer = keyframes({
  "0%": { backgroundPosition: "-200% 0" },
  "100%": { backgroundPosition: "200% 0" },
});

export const skeleton = style({
  background: `linear-gradient(90deg, ${vars.color.surface} 25%, ${vars.color.surfaceHover} 37%, ${vars.color.surface} 63%)`,
  backgroundSize: "200% 100%",
  animation: `${shimmer} 1.4s ease-in-out infinite`,
  borderRadius: vars.radius.sm,
});
