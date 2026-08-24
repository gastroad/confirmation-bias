export type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "cb-theme";

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

function isTheme(value: string | null): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

const THEME_CHANGE_EVENT = "cb-theme-change";

/** 현재 테마 선택값. SSR에서는 호출되지 않는다(getServerSnapshot이 "system" 반환). */
export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : "system";
}

/**
 * 테마 변경: localStorage 저장 + <html data-theme> 갱신 + 구독자에 알림.
 * system은 "기본값"이라 키/속성을 제거해 OS 설정을 따르게 한다.
 */
export function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.removeAttribute("data-theme");
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    root.setAttribute("data-theme", theme);
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** useSyncExternalStore용 구독: 로컬 변경 + 다른 탭(storage) 변경 모두 반영. */
export function subscribeTheme(callback: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
