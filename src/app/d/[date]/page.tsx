import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { getDayNav } from "../../_day-nav-data";
import { seedClusterFeed } from "../../_feed-seed";
import { AppShell } from "../../_shell";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { DateNav } from "@/features/date-nav";
import { OutletFilter, parseOutletParam } from "@/features/outlet-filter";
import { OUTLETS_PARAM } from "@/shared/config/search-params";
import { formatBucketDateLabel, isValidBucketDate } from "@/shared/lib/bucket-date";

type Params = Promise<{ date: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  if (!isValidBucketDate(date)) {
    return { title: "찾을 수 없는 날짜", robots: { index: false, follow: false } };
  }

  // 페이지 렌더와 같은 캐시 항목을 쓴다(getDayNav) — 요청당 DB 왕복을 늘리지 않는다.
  const nav = await getDayNav(date);
  const label = formatBucketDateLabel(date);
  const title = `${label} 뉴스`;
  const description =
    nav.clusterCount > 0
      ? `${label}에 보도된 ${nav.clusterCount.toLocaleString()}개 이슈, 기사 ${nav.articleCount.toLocaleString()}건. 진보·중도·보수 매체가 각 사건을 어떤 비중으로 다뤘는지 비교합니다.`
      : `${label}에는 수집된 기사가 없습니다.`;

  return {
    title,
    description,
    alternates: { canonical: `/d/${date}` },
    openGraph: { type: "website", url: `/d/${date}`, title, description },
    twitter: { card: "summary_large_image", title, description },
    // 색인 기준(기사 3건·성향 2진영)을 넘긴 이슈가 하나도 없는 날짜는 색인에서 뺀다.
    // 기사가 아예 없는 날짜뿐 아니라 **껍데기만 모인 날짜**도 여기 걸린다.
    // follow는 남겨 링크 그래프는 유지한다.
    ...(nav.indexableClusterCount > 0 ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function DatePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { date } = await params;
  if (!isValidBucketDate(date)) notFound();

  const sp = await searchParams;
  const outletsParam = sp[OUTLETS_PARAM];
  const outletIds = parseOutletParam(typeof outletsParam === "string" ? outletsParam : undefined);

  // 목록의 첫 페이지를 여기서 받아 위젯에 심는다 — 그래야 초기 HTML에 이슈가 들어간다.
  // 날짜 축과 함께 받아 왕복을 겹친다. → _feed-seed.ts
  const [nav, feedState] = await Promise.all([getDayNav(date), seedClusterFeed(outletIds, date)]);

  return (
    // 색인 대상인 날짜에서만 광고를 띄운다 → shared/ui/AdSenseLoader
    <AppShell back={{ href: "/", label: "최신" }} ads={nav.indexableClusterCount > 0}>
      <DateNav
        date={nav.date}
        prevDate={nav.prevDate}
        nextDate={nav.nextDate}
        clusterCount={nav.clusterCount}
        articleCount={nav.articleCount}
        outletIds={outletIds}
      />

      {/* Suspense는 useSearchParams를 쓰는 OutletFilter에만 씌운다. 목록까지 그 안에 넣으면
          경계째 지연 렌더로 밀려 초기 HTML에서 <div hidden>에 갇힌다 → _feed-seed.ts */}
      <Suspense fallback={null}>
        <OutletFilter />
      </Suspense>

      <HydrationBoundary state={feedState}>
        <ClusterFeed date={date} outletIds={outletIds} />
      </HydrationBoundary>
    </AppShell>
  );
}
