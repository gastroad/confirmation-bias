"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import * as styles from "./SiteNav.css";

// 푸터에 있던 두 항목을 헤더로 올렸다. 날짜별 목록(홈)만으로는 닿지 않는 다른 축의
// 읽을거리라, 지면 바닥에 두면 존재 자체가 발견되지 않는다.
const ITEMS = [
  { href: "/weekly", label: "주간 리포트" },
  { href: "/outlets", label: "언론사" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {ITEMS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={active ? styles.itemActive : styles.item}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
