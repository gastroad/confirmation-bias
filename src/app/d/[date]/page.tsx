import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findDaySummary } from "@server/queries/days";
import { getDayNav } from "../../_day-nav-data";
import { getSessionUser } from "@server/auth";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { DateNav } from "@/features/date-nav";
import { OutletFilter, parseOutletParam, OUTLETS_PARAM } from "@/features/outlet-filter";
import { ProfileMenu } from "@/features/profile-menu";
import { Logo } from "@/shared/ui";
import { formatBucketDateLabel, isValidBucketDate } from "@/shared/lib/bucket-date";
import { signOutAction } from "../../auth/actions";
import * as layout from "@/shared/styles/layout.css";

type Params = Promise<{ date: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

function toBucket(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  if (!isValidBucketDate(date)) {
    return { title: "찾을 수 없는 날짜", robots: { index: false, follow: false } };
  }

  const label = formatBucketDateLabel(date);
  const summary = await findDaySummary(toBucket(date));
  const title = `${label} 뉴스`;
  const description = summary
    ? `${label}에 보도된 ${summary.clusterCount.toLocaleString()}개 이슈, 기사 ${summary.articleCount.toLocaleString()}건. 진보·중도·보수 매체가 각 사건을 어떤 비중으로 다뤘는지 비교합니다.`
    : `${label}에는 수집된 기사가 없습니다.`;

  return {
    title,
    description,
    alternates: { canonical: `/d/${date}` },
    openGraph: { type: "website", url: `/d/${date}`, title, description },
    twitter: { card: "summary_large_image", title, description },
    // 기사가 없는 날짜는 색인 대상에서 뺀다(빈 페이지가 인덱싱되지 않게).
    ...(summary ? {} : { robots: { index: false, follow: true } }),
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
