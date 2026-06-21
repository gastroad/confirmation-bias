"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { LeaningBar, GroupRatioBadges, LEANING_LABELS } from "@/entities/outlet";
import { fetchClustersPage, fetchClusterStats, type ClusterSummary } from "@/entities/cluster";
import { OUTLETS_PARAM, parseOutletParam } from "@/features/outlet-filter";
import { formatRelative } from "@/shared/lib/format";
import { useInfiniteScroll } from "@/shared/lib/useInfiniteScroll";
import { Skeleton } from "@/shared/ui";
import * as styles from "./ClusterFeed.css";

const SKELETON_COUNT = 5;

function StatsBar({ outletIds }: { outletIds: string[] }) {
  const { data } = useQuery({
    queryKey: ["cluster-stats", outletIds.join(",")],
    queryFn: () => fetchClusterStats(outletIds),
  });

  const dominant = data?.dominantLeaning ? LEANING_LABELS[data.dominantLeaning] : "—";

  return (
    <div className={styles.stats}>
      <div className={styles.statCell}>
        <p className={styles.statValue}>{data?.clusterCount ?? "—"}</p>
        <p className={styles.statLabel}>이슈 클러스터</p>
      </div>
      <div className={styles.statCellDivided}>
        <p className={styles.statValue}>{data?.articleCount ?? "—"}</p>
        <p className={styles.statLabel}>수집 기사</p>
      </div>
      <div className={styles.statCell}>
        <p className={styles.statValue}>{dominant}</p>
        <p className={styles.statLabel}>최다 보도 성향</p>
      </div>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: ClusterSummary }) {
  return (
    <Link href={`/clusters/${cluster.id}`} className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{cluster.representativeTitle}</h3>
        <span className={styles.cardTime}>{formatRelative(cluster.latestPublishedAt)}</span>
      </div>

      <LeaningBar distribution={cluster.leaningDistribution} />

      <div className={styles.cardFooter}>
        <GroupRatioBadges ratios={cluster.leaningGroupRatios} />
        <span className={styles.cardCount}>{cluster.articleCount}건</span>
      </div>
    </Link>
  );
}

function ClusterCardSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="100%" height={12} radius={9999} />
      <Skeleton width="40%" height={12} />
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className={styles.list}>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <li key={i}>
          <ClusterCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function ClusterFeed() {
  const searchParams = useSearchParams();
  const outletIds = parseOutletParam(searchParams.get(OUTLETS_PARAM));
  const isFiltered = outletIds.length > 0;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["clusters", outletIds.join(",")],
      queryFn: ({ pageParam }) => fetchClustersPage({ cursor: pageParam, outletIds }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    onLoadMore: () => fetchNextPage(),
    enabled: hasNextPage && !isFetchingNextPage,
  });

  const clusters = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <StatsBar outletIds={outletIds} />

      <section>
        <h2 className={styles.sectionTitle}>이슈 목록</h2>

        {isLoading ? (
          <SkeletonList />
        ) : isError ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>목록을 불러오지 못했습니다.</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>
              다시 시도
            </button>
          </div>
        ) : clusters.length === 0 ? (
          <div className={styles.emptyState}>
            {isFiltered ? (
              <>
                <p className={styles.emptyTitle}>선택한 언론사가 보도한 이슈가 없습니다.</p>
                <p className={styles.emptyHint}>필터를 조정해 보세요.</p>
              </>
            ) : (
              <>
                <p className={styles.emptyTitle}>데이터가 없습니다.</p>
                <p className={styles.emptyHint}>
                  <code className={styles.code}>npm run ingest</code> 로 기사를 수집해주세요.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {clusters.map((c) => (
                <li key={c.id}>
                  <ClusterCard cluster={c} />
                </li>
              ))}
            </ul>

            {isFetchingNextPage && <SkeletonList />}
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
            {!hasNextPage && <p className={styles.status}>모든 이슈를 불러왔습니다</p>}
          </>
        )}
      </section>
    </>
  );
}
