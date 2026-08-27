import { Suspense } from "react";
import { getDayNav, getLatestDate } from "./_day-nav-data";
import { getSessionUser } from "@server/auth";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { DateNav } from "@/features/date-nav";
import { OutletFilter, parseOutletParam, OUTLETS_PARAM } from "@/features/outlet-filter";
import { ProfileMenu } from "@/features/profile-menu";
import { AdSenseLoader, Logo } from "@/shared/ui";
import { signOutAction } from "./auth/actions";
import * as layout from "@/shared/styles/layout.css";

type Search = Promise<Record<string, string | string[] | undefined>>;

// 홈은 최신 날짜로 리다이렉트하지 않고 직접 렌더한다. 리다이렉트는 canonical이 매일 바뀌어
// 색인이 흩어지는데, 홈이 스스로 최신을 담으면 루트 URL 하나로 권위가 모인다.
export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const outletsParam = sp[OUTLETS_PARAM];
  const outletIds = parseOutletParam(typeof outletsParam === "string" ? outletsParam : undefined);

  const sessionUser = await getSessionUser();
  const date = await getLatestDate();
  const nav = date ? await getDayNav(date) : null;

  return (
    <div className={layout.page}>
      {/* 최신 날짜에 색인 대상 이슈가 있을 때만 광고를 띄운다 → shared/ui/AdSenseLoader */}
      {nav && nav.indexableClusterCount > 0 && <AdSenseLoader />}

      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Logo size={28} className={layout.logo} />
          <h1 className={layout.brand}>확증편향</h1>
          <p className={layout.brandSub}>언론사 성향별 뉴스 보도 분석</p>
          <div className={layout.headerActions}>
            <ProfileMenu user={sessionUser} signOut={signOutAction} />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        {nav && (
          <DateNav
            date={nav.date}
            prevDate={nav.prevDate}
            nextDate={nav.nextDate}
            clusterCount={nav.clusterCount}
            articleCount={nav.articleCount}
            outletIds={outletIds}
          />
        )}

        {/* OutletFilter / ClusterFeed가 useSearchParams를 쓰므로 Suspense 경계가 필요 */}
        <Suspense fallback={null}>
          <OutletFilter />
          <ClusterFeed date={date ?? undefined} />
        </Suspense>
      </main>
    </div>
  );
}
