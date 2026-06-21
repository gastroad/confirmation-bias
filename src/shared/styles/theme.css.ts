import {
  createGlobalTheme,
  createGlobalThemeContract,
  globalStyle,
  assignVars,
} from "@vanilla-extract/css";

export const vars = createGlobalThemeContract(
  {
    color: {
      bg: "color-bg",
      surface: "color-surface",
      surfaceHover: "color-surface-hover",
      border: "color-border",
      borderHover: "color-border-hover",
      text: "color-text",
      textSecondary: "color-text-secondary",
      textMuted: "color-text-muted",
      textFaint: "color-text-faint",
      accent: "color-accent",
      chartLine: "color-chart-line",
      chartGrid: "color-chart-grid",
      badgeConservativeBg: "color-badge-conservative-bg",
      badgeConservativeFg: "color-badge-conservative-fg",
      badgeNeutralBg: "color-badge-neutral-bg",
      badgeNeutralFg: "color-badge-neutral-fg",
      badgeProgressiveBg: "color-badge-progressive-bg",
      badgeProgressiveFg: "color-badge-progressive-fg",
    },
    radius: {
      sm: "radius-sm",
      md: "radius-md",
      lg: "radius-lg",
      full: "radius-full",
    },
    font: {
      sans: "font-sans",
      mono: "font-mono",
    },
    layout: {
      maxWidth: "layout-max-width",
    },
  },
  (value) => `cb-${value}`
);

type ColorTokens = Record<keyof typeof vars.color, string>;

const lightColors: ColorTokens = {
  bg: "#ffffff",
  surface: "#fafafa",
  surfaceHover: "#f4f4f5",
  border: "#e4e4e7",
  borderHover: "#a1a1aa",
  text: "#18181b",
  textSecondary: "#52525b",
  textMuted: "#71717a",
  textFaint: "#a1a1aa",
  accent: "#4f46e5",
  chartLine: "#6366f1",
  chartGrid: "rgba(113, 113, 122, 0.18)",
  badgeConservativeBg: "#fee2e2",
  badgeConservativeFg: "#b91c1c",
  badgeNeutralBg: "#f4f4f5",
  badgeNeutralFg: "#52525b",
  badgeProgressiveBg: "#dbeafe",
  badgeProgressiveFg: "#1d4ed8",
};

const darkColors: ColorTokens = {
  bg: "#0a0a0a",
  surface: "#18181b",
  surfaceHover: "#27272a",
  border: "#27272a",
  borderHover: "#52525b",
  text: "#fafafa",
  textSecondary: "#d4d4d8",
  textMuted: "#a1a1aa",
  textFaint: "#71717a",
  accent: "#818cf8",
  chartLine: "#818cf8",
  chartGrid: "rgba(161, 161, 170, 0.18)",
  badgeConservativeBg: "rgba(239, 68, 68, 0.18)",
  badgeConservativeFg: "#fca5a5",
  badgeNeutralBg: "rgba(161, 161, 170, 0.18)",
  badgeNeutralFg: "#d4d4d8",
  badgeProgressiveBg: "rgba(59, 130, 246, 0.18)",
  badgeProgressiveFg: "#93c5fd",
};

createGlobalTheme(":root", vars, {
  color: lightColors,
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
  font: {
    // Geist variables are injected on <html> by next/font in layout.tsx.
    sans: "var(--font-geist-sans), system-ui, sans-serif",
    mono: "var(--font-geist-mono), monospace",
  },
  layout: {
    maxWidth: "48rem",
  },
});

// 다크 토큰 묶음. 색 토큰만 재할당한다(radius/font/layout은 공통).
const darkVars = assignVars(vars.color, darkColors);

// 시스템 모드(= data-theme 속성 없음)일 때만 OS 설정을 따른다.
// 사용자가 라이트/다크를 명시하면 아래 [data-theme] 규칙이 우선한다.
globalStyle(":root:not([data-theme])", {
  "@media": {
    "(prefers-color-scheme: dark)": {
      vars: darkVars,
    },
  },
});

// 사용자가 명시적으로 다크를 선택.
// (data-theme="light"는 :root 기본값이 라이트라 별도 규칙 불필요)
globalStyle(':root[data-theme="dark"]', {
  vars: darkVars,
});
