"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { type Theme, THEME_OPTIONS, getStoredTheme, setTheme, subscribeTheme } from "../model";
import * as styles from "./ThemeToggle.css";

const ICONS: Record<Theme, ReactNode> = {
  system: (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    </svg>
  ),
  light: (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
        strokeLinecap="round"
      />
    </svg>
  ),
  dark: (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
    </svg>
  ),
};

export function ThemeToggle() {
  // SSR 스냅샷은 "system"으로 통일해 하이드레이션 불일치를 피하고,
  // 클라이언트에서는 저장된 값을 읽는다(useSyncExternalStore가 effect 없이 동기화).
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, () => "system" as Theme);

  return (
    <div className={styles.root} role="group" aria-label="테마 선택">
      {THEME_OPTIONS.map(({ value, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            title={label}
            className={active ? styles.buttonActive : styles.button}
          >
            {ICONS[value]}
            <span className={styles.srOnly}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
