import Link from "next/link";

import { SITE_NAME, CONTACT_EMAIL } from "@/shared/config/site";
import * as styles from "./SiteFooter.css";

/**
 * 지면 바닥. 헤더와 달리 페이지마다 달라질 것이 없어 루트 레이아웃이 한 번만 세운다
 * (`app/layout.tsx`) — 그래야 셸을 쓰지 않는 상태 화면(error·not-found·loading)에도 뜬다.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>
          © {new Date().getFullYear()} {SITE_NAME}
        </span>
        {/* 주간 리포트·언론사는 헤더의 주요 메뉴로 옮겼다 → widgets/site-header.
            푸터에는 지면 자체가 아니라 지면에 대한 고지(약관·방침·문의)만 남긴다. */}
        <nav className={styles.links}>
          <Link className={styles.link} href="/">
            홈
          </Link>
          <Link className={styles.link} href="/about">
            소개 및 방법론
          </Link>
          <Link className={styles.link} href="/terms">
            이용약관
          </Link>
          <Link className={styles.link} href="/privacy">
            개인정보처리방침
          </Link>
          <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
            문의
          </a>
        </nav>
      </div>
    </footer>
  );
}
