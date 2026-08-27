import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDayNav } from "../../_day-nav-data";
import { getSessionUser } from "@server/auth";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { DateNav } from "@/features/date-nav";
import { OutletFilter, parseOutletParam, OUTLETS_PARAM } from "@/features/outlet-filter";
import { ProfileMenu } from "@/features/profile-menu";
import { AdSenseLoader, Logo } from "@/shared/ui";
import { formatBucketDateLabel, isValidBucketDate } from "@/shared/lib/bucket-date";
import { signOutAction } from "../../auth/actions";
import * as layout from "@/shared/styles/layout.css";

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

  const sessionUser = await getSessionUser();
  const nav = await getDayNav(date);

  return (
    <div className={layout.page}>
      {/* 색인 대상인 날짜에서만 광고를 띄운다 → shared/ui/AdSenseLoader */}
      {nav.indexableClusterCount > 0 && <AdSenseLoader />}

      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/" className={layout.backLink}>
            ← 최신
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
          <h1 className={layout.brandSmall}>확증편향</h1>
          <div className={layout.headerActions}>
            <ProfileMenu user={sessionUser} signOut={signOutAction} />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        <DateNav
          date={nav.date}
          prevDate={nav.prevDate}
          nextDate={nav.nextDate}
          clusterCount={nav.clusterCount}
          articleCount={nav.articleCount}
          outletIds={outletIds}
        />

        {/* OutletFilter / ClusterFeed가 useSearchParams를 쓰므로 Suspense 경계가 필요 */}
        <Suspense fallback={null}>
          <OutletFilter />
          <ClusterFeed date={date} />
        </Suspense>
      </main>
    </div>
  );
}
