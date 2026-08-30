import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredTheme,
  setTheme,
  subscribeTheme,
  THEME_STORAGE_KEY,
  THEME_OPTIONS,
} from "./theme";

// 테마는 localStorage와 <html data-theme>, 두 곳에 동시에 반영된다.
// 하나만 갱신되면 FOUC 방지 스크립트(ThemeScript)와 어긋나 새로고침 때 화면이 번쩍인다.
const root = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root().removeAttribute("data-theme");
});

describe("getStoredTheme", () => {
  it("저장값이 없으면 system", () => {
    expect(getStoredTheme()).toBe("system");
  });

  it("저장된 값을 돌려준다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("알 수 없는 값은 system으로 떨어진다 — 남이 쓴 쿠키/스토리지를 신뢰하지 않는다", () => {
    for (const bogus of ["", "DARK", "solarized", "null"]) {
      localStorage.setItem(THEME_STORAGE_KEY, bogus);
      expect(getStoredTheme()).toBe("system");
    }
  });
});

describe("setTheme", () => {
  it("light/dark는 저장하고 data-theme에 반영한다", () => {
    setTheme("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(root().getAttribute("data-theme")).toBe("dark");

    setTheme("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(root().getAttribute("data-theme")).toBe("light");
  });

  it("system은 키와 속성을 **지운다** — OS 설정을 따라야 하므로 값을 남기지 않는다", () => {
    setTheme("dark");
    setTheme("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(root().hasAttribute("data-theme")).toBe(false);
  });

  it("저장값과 data-theme이 항상 함께 움직인다", () => {
    for (const theme of ["dark", "light", "system", "light"] as const) {
      setTheme(theme);
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const attr = root().getAttribute("data-theme");
      expect(stored).toBe(attr);
      expect(getStoredTheme()).toBe(theme);
    }
  });
});

describe("subscribeTheme", () => {
  it("setTheme이 구독자를 깨운다", () => {
    const cb = vi.fn();
    subscribeTheme(cb);
    setTheme("dark");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("다른 탭의 변경(storage 이벤트)도 반영한다", () => {
    const cb = vi.fn();
    subscribeTheme(cb);
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("해제하면 더 이상 부르지 않는다 — useSyncExternalStore의 계약", () => {
    const cb = vi.fn();
    const unsubscribe = subscribeTheme(cb);
    unsubscribe();

    setTheme("dark");
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));
    expect(cb).not.toHaveBeenCalled();
  });

  it("구독자가 여럿이면 모두 깨운다", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeTheme(a);
    subscribeTheme(b);
    setTheme("light");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe("THEME_OPTIONS", () => {
  it("세 가지를 모두 제공하고 system이 먼저다 (기본값)", () => {
    expect(THEME_OPTIONS.map((o) => o.value)).toEqual(["system", "light", "dark"]);
  });

  it("모든 선택지가 setTheme이 받아들이는 값이다", () => {
    for (const { value, label } of THEME_OPTIONS) {
      expect(label).toBeTruthy();
      setTheme(value);
      expect(getStoredTheme()).toBe(value);
    }
  });
});
