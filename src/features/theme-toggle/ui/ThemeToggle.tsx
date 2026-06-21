"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { SunIcon, MoonIcon, MonitorIcon } from "@/shared/ui";
import { type Theme, THEME_OPTIONS, getStoredTheme, setTheme, subscribeTheme } from "../model";
import * as styles from "./ThemeToggle.css";

const ICONS: Record<Theme, ReactNode> = {
  system: <MonitorIcon />,
  light: <SunIcon />,
  dark: <MoonIcon />,
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
