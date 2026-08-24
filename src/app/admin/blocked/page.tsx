import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, isAdmin } from "@server/auth";
import { findBlockedUrls, countBlockedUrls } from "@server/queries/blocked-urls";
import { ProfileMenu } from "@/features/profile-menu";
import { Logo } from "@/shared/ui";
import { formatDate } from "@/shared/lib/format";
import { signOutAction } from "../../auth/actions";
import { blockUrlAction, unblockUrlAction } from "./actions";
import { BlockForm, UnblockButton } from "./BlockForm";
import * as styles from "./blocked.css";
import * as layout from "@/shared/styles/layout.css";

export const metadata: Metadata = {
  title: "차단 기사 관리",
  robots: { index: false, follow: false },
};

export default async function BlockedUrlsPage() {
  const sessionUser = await getSessionUser();
  const denied = !isAdmin(sessionUser);

  // 권한이 없으면 조회 자체를 하지 않는다(화면만 가리면 데이터가 HTML에 실린다).
  const [rows, total] = denied
    ? [[], 0]
    : await Promise.all([findBlockedUrls(), countBlockedUrls()]);

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/admin" className={layout.backLink}>
            ← 관리
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
          <h1 className={layout.brandSmall}>차단 기사</h1>
          <div className={layout.headerActions}>
            <ProfileMenu user={sessionUser} signOut={signOutAction} />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        {denied ? (
          <p className={styles.error}>
            관리자 권한이 필요합니다. 계정에 <code>admin</code> 역할이 부여되어야 합니다.
          </p>
        ) : (
          <>
            <BlockForm action={blockUrlAction} />

            <div className={styles.header}>
              <h2 className={styles.title}>차단 목록</h2>
              <span className={styles.count}>{total.toLocaleString()}건</span>
            </div>

            {rows.length === 0 ? (
              <p className={styles.empty}>차단된 기사가 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {rows.map((r) => (
                  <li key={r.url} className={styles.item}>
                    <div className={styles.meta}>
                      <span className={styles.time}>{formatDate(r.createdAt.toISOString())}</span>
                      <UnblockButton url={r.url} action={unblockUrlAction} />
                    </div>
                    <p className={styles.url}>{r.url}</p>
                    {r.reason && <p className={styles.reason}>{r.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
