import { Suspense } from "react";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { ThemeToggle } from "@/features/theme-toggle";
import { OutletFilter } from "@/features/outlet-filter";
import { Logo } from "@/shared/ui";
import * as layout from "@/shared/styles/layout.css";

export default function HomePage() {
  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Logo size={28} className={layout.logo} />
          <h1 className={layout.brand}>확증편향</h1>
          <p className={layout.brandSub}>언론사 성향별 뉴스 보도 분석</p>
          <div className={layout.headerActions}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        {/* OutletFilter / ClusterFeed가 useSearchParams를 쓰므로 Suspense 경계가 필요 */}
        <Suspense fallback={null}>
          <OutletFilter />
          <ClusterFeed />
        </Suspense>
      </main>
    </div>
  );
}
