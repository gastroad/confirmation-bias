import Link from "next/link";

import { ProfileMenu, type ProfileMenuUser } from "@/features/profile-menu";
import { SITE_NAME } from "@/shared/config/site";
import { Logo } from "@/shared/ui";
import * as layout from "@/shared/styles/layout.css";
import { SiteNav } from "./SiteNav";
import * as styles from "./SiteHeader.css";

interface SiteHeaderProps {
  /** 비로그인이면 null. 서버 컴포넌트가 세션을 읽어 내려준다. */
  user: ProfileMenuUser | null;
  signOut: () => Promise<void>;
  /**
   * 홈이 아닌 곳으로 돌아가는 화면만 세운다(그날 목록·언론사 허브·관리).
   * 홈으로 가는 길은 브랜드 락업이 이미 맡고 있어 "← 홈"은 같은 줄에서 자리만 먹는다.
   */
  back?: { href: string; label: string };
  /** 브랜드 자리에 다른 이름을 세우는 화면(관리 콘솔 등) */
  title?: string;
  /** 홈만 로고를 크게 세우고 태그라인을 단다 */
  hero?: boolean;
}

export function SiteHeader({ user, signOut, back, title, hero = false }: SiteHeaderProps) {
  const wordmark = [hero ? layout.brand : layout.brandSmall, back && styles.wordmarkCompact]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={layout.header}>
      <div className={layout.headerInner}>
        {back && (
          <>
            <Link href={back.href} className={layout.backLink}>
              ← {back.label}
            </Link>
            <span className={layout.divider} aria-hidden>
              |
            </span>
          </>
        )}

        {title ? (
          <>
            <Logo size={20} className={layout.logo} />
            <h1 className={layout.brandSmall}>{title}</h1>
          </>
        ) : (
          <Link href="/" className={styles.brandLink} aria-label={`${SITE_NAME} 홈`}>
            <Logo size={hero ? 28 : 20} className={layout.logo} />
            <h1 className={wordmark}>{SITE_NAME}</h1>
          </Link>
        )}
        {hero && <p className={layout.brandSub}>언론사 성향별 뉴스 보도 분석</p>}

        <div className={layout.headerActions}>
          <SiteNav />
          <ProfileMenu user={user} signOut={signOut} />
        </div>
      </div>
    </header>
  );
}
