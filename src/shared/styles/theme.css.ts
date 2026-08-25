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
      control: "color-control",
      border: "color-border",
      borderHover: "color-border-hover",
      text: "color-text",
      textSecondary: "color-text-secondary",
      textMuted: "color-text-muted",
      textFaint: "color-text-faint",
      accent: "color-accent",
      accentFg: "color-accent-fg",
      rail: "color-rail",
      meridian: "color-meridian",
      chartLine: "color-chart-line",
      chartGrid: "color-chart-grid",
      dangerBg: "color-danger-bg",
      dangerFg: "color-danger-fg",
      successFg: "color-success-fg",
    },
    // 성향 색은 데이터에서 오지만 라이트/다크에서 값이 달라야 한다. 상수로 두면
    // 테마를 따라갈 수 없어 토큰으로 승격했다 → entities/outlet/model.ts
    leaning: {
      left: "leaning-left",
      centerLeft: "leaning-center-left",
      center: "leaning-center",
      centerRight: "leaning-center-right",
      right: "leaning-right",
      unknown: "leaning-unknown",
      progressiveText: "leaning-progressive-text",
      conservativeText: "leaning-conservative-text",
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
type LeaningTokens = Record<keyof typeof vars.leaning, string>;

// 대비 기준: 지면(bg)이 카드(surface)보다 어두우므로 **bg가 최악의 배경**이다.
// (구 팔레트는 반대라 surface를 기준으로 봤다. 뒤집었으니 기준도 뒤집힌다.)
// textFaint #5d6470 은 #ebedf0 위에서 4.87:1 — 이보다 흐린 단계는 만들 수 없다.
//
// 브랜드 액센트에 유채색을 두지 않는다. 이 화면에서 파랑·빨강은 성향의 의미를 독점해야
// 하고, 세 번째 유채색이 들어오면 독자가 매번 "이 색은 성향인가 브랜드인가"를 판단해야
// 한다. 활성 상태는 색 대신 잉크 반전(accent/accentFg), 링크는 밑줄로 구분한다.
const lightColors: ColorTokens = {
  bg: "#ebedf0",
  surface: "#ffffff",
  surfaceHover: "#f5f6f8",
  control: "#ffffff",
  border: "#d6dae0",
  borderHover: "#a9b0ba",
  text: "#14171c",
  textSecondary: "#3d434c",
  textMuted: "#565c66",
  textFaint: "#5d6470",
  accent: "#14171c",
  accentFg: "#ffffff",
  rail: "#d6dae0",
  meridian: "#c0c6ce",
  chartLine: "#3d434c",
  chartGrid: "rgba(20, 23, 28, 0.1)",
  dangerBg: "#fdecea",
  dangerFg: "#b02218",
  successFg: "#1f6f43",
};

const darkColors: ColorTokens = {
  bg: "#0d0f13",
  surface: "#171a20",
  surfaceHover: "#1e222a",
  control: "#1e222a",
  border: "#272c34",
  borderHover: "#3d444f",
  text: "#f3f5f8",
  textSecondary: "#c9d0d9",
  textMuted: "#a2aab6",
  textFaint: "#8b939f",
  accent: "#f3f5f8",
  accentFg: "#0d0f13",
  rail: "#272c34",
  meridian: "#343a44",
  chartLine: "#c9d0d9",
  chartGrid: "rgba(243, 245, 248, 0.1)",
  dangerBg: "rgba(226, 96, 92, 0.16)",
  dangerFg: "#f0736f",
  successFg: "#5fbf87",
};

const lightLeaning: LeaningTokens = {
  left: "#1d4ed8",
  centerLeft: "#7fa5f0",
  center: "#949ba5",
  centerRight: "#ec9c99",
  right: "#c4231e",
  unknown: "#c8cdd4",
  progressiveText: "#1d4ed8",
  conservativeText: "#c4231e",
};

const darkLeaning: LeaningTokens = {
  left: "#4f87f2",
  centerLeft: "#2e5399",
  center: "#6b727c",
  centerRight: "#8e3532",
  right: "#e2605c",
  unknown: "#3a4049",
  progressiveText: "#6699f5",
  conservativeText: "#f0736f",
};

createGlobalTheme(":root", vars, {
  color: lightColors,
  leaning: lightLeaning,
  radius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    full: "9999px",
  },
  font: {
    // IBM Plex 변수는 next/font가 <html>에 주입한다 (layout.tsx).
    // Geist는 라틴 서브셋만 실어 화면의 한글이 전부 시스템 폰트로 떨어졌다.
    sans: "var(--font-plex-sans-kr), -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    mono: "var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  layout: {
    // 스펙트럼 막대가 중심선 기준으로 좌우로 자라려면 가로가 필요하다.
    maxWidth: "64rem",
  },
});

// 다크 토큰 묶음. 색 토큰만 재할당한다(radius/font/layout은 공통).
const darkVars = assignVars({ ...vars.color, ...vars.leaning }, { ...darkColors, ...darkLeaning });

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
