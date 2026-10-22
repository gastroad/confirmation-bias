import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { getDayNav, getLatestDate } from "./_day-nav-data";
import { seedClusterFeed } from "./_feed-seed";
import { AppShell } from "./_shell";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { DateNav } from "@/features/date-nav";
import { OutletFilter, parseOutletParam } from "@/features/outlet-filter";
import { OUTLETS_PARAM } from "@/shared/config/search-params";

type Search = Promise<Record<string, string | string[] | undefined>>;

// 홈은 최신 날짜로 리다이렉트하지 않고 직접 렌더한다. 리다이렉트는 canonical이 매일 바뀌어
// 색인이 흩어지는데, 홈이 스스로 최신을 담으면 루트 URL 하나로 권위가 모인다.
export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const outletsParam = sp[OUTLETS_PARAM];
  const outletIds = parseOutletParam(typeof outletsParam === "string" ? outletsParam : undefined);

  const date = await getLatestDate();
  // 목록의 첫 페이지를 여기서 받아 위젯에 심는다 — 그래야 초기 HTML에 이슈가 들어간다.
  // 날짜 축과 함께 받아 왕복을 겹친다. → _feed-seed.ts
  const [nav, feedState] = await Promise.all([
    date ? getDayNav(date) : null,
    seedClusterFeed(outletIds, date ?? undefined),
  ]);

  return (
    // 최신 날짜에 색인 대상 이슈가 있을 때만 광고를 띄운다 → shared/ui/AdSenseLoader
    <AppShell hero ads={Boolean(nav && nav.indexableClusterCount > 0)}>
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

      {/* Suspense는 useSearchParams를 쓰는 OutletFilter에만 씌운다. 목록까지 그 안에 넣으면
          경계째 지연 렌더로 밀려 초기 HTML에서 <div hidden>에 갇힌다 → _feed-seed.ts */}
      <Suspense fallback={null}>
        <OutletFilter />
      </Suspense>

      <HydrationBoundary state={feedState}>
        <ClusterFeed date={date ?? undefined} outletIds={outletIds} />
      </HydrationBoundary>
    </AppShell>
  );
}
