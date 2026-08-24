import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, isAdmin } from "@server/auth";
import { AuthMenu } from "@/features/auth-menu";
import { ThemeToggle } from "@/features/theme-toggle";
import { Logo } from "@/shared/ui";
import { signOutAction } from "../auth/actions";
import { triggerCollectAction, triggerClusterAction } from "./actions";
import { CollectPanel, ClusterPanel } from "./TriggerPanel";
import * as styles from "./admin.css";
import * as layout from "@/shared/styles/layout.css";

export const metadata: Metadata = {
  title: "관리",
  robots: { index: false, follow: false },
};

// 수집 트리거는 GitHub Actions를 돌리므로 캐시되면 안 된다.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sessionUser = await getSessionUser();
  const hasToken = Boolean(process.env.GITHUB_DISPATCH_TOKEN);

  // proxy가 비로그인을 로그인 화면으로 보내므로 여기 오는 건 로그인은 된 사용자다.
  // next/navigation의 forbidden()은 experimental(authInterrupts) 플래그가 필요해 쓰지 않고,
  // 권한 부족을 그대로 화면으로 알린다.
  const denied = !isAdmin(sessionUser);

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/" className={layout.backLink}>
            ← 홈
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
          <h1 className={layout.brandSmall}>관리</h1>
          <div className={layout.headerActions}>
            <AuthMenu user={sessionUser} signOut={signOutAction} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        {denied ? (
          <p className={styles.warning}>
            관리자 권한이 필요합니다. 계정에 <code>admin</code> 역할이 부여되어야 합니다.
          </p>
        ) : (
          <>
            {!hasToken && (
              <p className={styles.warning}>
                <code>GITHUB_DISPATCH_TOKEN</code>이 설정되지 않아 실행 요청이 실패합니다. 로컬은{" "}
                <code>.env</code>, 배포는 Vercel 환경변수에 넣어주세요.
              </p>
            )}

            {/* Server Action을 클라이언트 패널에 주입한다. 패널이 server/를 직접 만지지 않게. */}
            <CollectPanel action={triggerCollectAction} />
            <ClusterPanel action={triggerClusterAction} />
          </>
        )}
      </main>
    </div>
  );
}
