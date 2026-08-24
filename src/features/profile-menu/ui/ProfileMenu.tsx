"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckIcon, UserIcon } from "@/shared/ui";
import {
  type Theme,
  THEME_OPTIONS,
  getStoredTheme,
  setTheme,
  subscribeTheme,
} from "@/shared/lib/theme";
import * as styles from "./ProfileMenu.css";

export interface ProfileMenuUser {
  email: string;
  name: string | null;
  role: "user" | "admin";
}

interface ProfileMenuProps {
  /** 비로그인이면 null. 서버 컴포넌트가 세션을 읽어 내려준다. */
  user: ProfileMenuUser | null;
  signOut: () => Promise<void>;
}

function initial(user: ProfileMenuUser): string {
  const source = user.name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
}

export function ProfileMenu({ user, signOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // SSR 스냅샷은 "system"으로 통일해 하이드레이션 불일치를 피한다.
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, () => "system" as Theme);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={user ? styles.triggerSignedIn : styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `${user.email} 메뉴` : "계정 메뉴"}
      >
        {user ? initial(user) : <UserIcon size={16} />}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          {user && (
            <>
              <div className={styles.identity}>
                <span className={styles.identityName}>{user.name?.trim() || "회원"}</span>
                <span className={styles.identityEmail}>{user.email}</span>
              </div>
              {user.role === "admin" && (
                <Link href="/admin" className={styles.rowAccent} role="menuitem">
                  관리
                </Link>
              )}
              <div className={styles.divider} />
            </>
          )}

          <span className={styles.groupLabel}>테마</span>
          {THEME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              className={theme === value ? styles.rowActive : styles.row}
              onClick={() => setTheme(value)}
            >
              {label}
              {theme === value && <CheckIcon size={14} className={styles.check} />}
            </button>
          ))}

          <div className={styles.divider} />

          {user ? (
            <>
              <form action={signOut} className={styles.form}>
                <button type="submit" className={styles.row} role="menuitem">
                  로그아웃
                </button>
              </form>
              <Link href="/account/delete" className={styles.rowDanger} role="menuitem">
                회원 탈퇴
              </Link>
            </>
          ) : (
            <Link href="/auth/sign-in" className={styles.rowAccent} role="menuitem">
              로그인
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
