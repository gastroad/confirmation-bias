"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  LeaningBar,
  TILT_COLORS,
  tiltSide,
  TILT_BALANCE_THRESHOLD,
  calcTilt,
  calcLeaningGroupRatios,
  LEANING_GROUP_LABELS,
} from "@/entities/outlet";
import {
  fetchClustersPage,
  fetchClusterStats,
  partitionBySpread,
  type ClusterSummary,
} from "@/entities/cluster";
import { OUTLETS_PARAM, parseOutletParam } from "@/features/outlet-filter";
import { useInfiniteScroll } from "@/shared/lib/useInfiniteScroll";
import { Skeleton } from "@/shared/ui";
import * as styles from "./ClusterFeed.css";

const SKELETON_COUNT = 5;

/** "보수 +20" / "균형". 막대가 말하는 것을 수치로 한 번 더 못박는다. */
function TiltLabel({ tilt, className }: { tilt: number; className?: string }) {
  const side = tiltSide(tilt);
  const text =
    side === "balanced"
      ? "균형"
      : `${side === "progressive" ? LEANING_GROUP_LABELS.progressive : LEANING_GROUP_LABELS.conservative} +${Math.round(Math.abs(tilt))}`;

  return (
    <span className={className} style={{ color: TILT_COLORS[side] }}>
      {text}
    </span>
  );
}

/**
 * 하루 전체 스펙트럼. 숫자 세 칸 대신 한 문장 판단과 막대 하나로 말한다.
 * 목록의 막대와 같은 기하학을 쓰므로 "아래 이슈들의 합"으로 읽힌다.
 */
function DaySpectrum({ outletIds, date }: { outletIds: string[]; date?: string }) {
  const { data } = useQuery({
    queryKey: ["cluster-stats", outletIds.join(","), date ?? ""],
    queryFn: () => fetchClusterStats(outletIds, date),
  });

  if (!data) {
    return (
      <div className={styles.daySpectrum}>
        <Skeleton width="70%" height={18} />
        <div className={styles.dayTrack}>
          <Skeleton width="100%" height={18} radius={2} />
        </div>
      </div>
    );
  }

  const tilt = calcTilt(calcLeaningGroupRatios(data.leaningDistribution));

  return (
    <div className={styles.daySpectrum}>
      <p className={styles.lede}>
        <b>{data.articleCount.toLocaleString()}건</b>의 기사가{" "}
        <b>{data.clusterCount.toLocaleString()}개 사건</b>으로 묶였습니다.{" "}
        <DayVerdict tilt={tilt} />
      </p>
      <div className={styles.dayTrack}>
        <LeaningBar distribution={data.leaningDistribution} showLabels large />
      </div>
    </div>
  );
}

function DayVerdict({ tilt }: { tilt: number }) {
  const side = tiltSide(tilt);
  if (side === "balanced") return <>진영 간 보도량은 균형에 가깝습니다.</>;
  const name =
    side === "progressive" ? LEANING_GROUP_LABELS.progressive : LEANING_GROUP_LABELS.conservative;
  const other =
    side === "progressive" ? LEANING_GROUP_LABELS.conservative : LEANING_GROUP_LABELS.progressive;
  return (
    <>
      {name} 성향 매체가 {other}보다 <b>{Math.abs(tilt).toFixed(1)}%p</b> 많이 썼습니다.
    </>
  );
}

function ClusterCard({ cluster }: { cluster: ClusterSummary }) {
  return (
    <Link href={`/clusters/${cluster.id}`} className={styles.card}>
      <h3 className={styles.cardTitle}>{cluster.representativeTitle}</h3>
      <LeaningBar distribution={cluster.leaningDistribution} />

      <div className={styles.cardMeta}>
        <span className={styles.cardStat}>
          <em className={styles.cardNum}>{cluster.articleCount}</em>건 ·{" "}
          <em className={styles.cardNum}>{cluster.outletCount}</em>개사
        </span>
        <TiltLabel tilt={cluster.tilt} className={styles.cardTilt} />
      </div>
    </Link>
  );
}

function ClusterCardSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="100%" height={11} radius={2} />
      <Skeleton width="42%" height={11} />
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

interface ClusterFeedProps {
  /** 지정하면 그 KST 하루만 보여준다. 없으면 전 기간 최신순. */
  date?: string;
}

export function ClusterFeed({ date }: ClusterFeedProps = {}) {
  const searchParams = useSearchParams();
  const outletIds = parseOutletParam(searchParams.get(OUTLETS_PARAM));
  const isFiltered = outletIds.length > 0;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["clusters", outletIds.join(","), date ?? ""],
      queryFn: ({ pageParam }) => fetchClustersPage({ cursor: pageParam, outletIds, date }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    onLoadMore: () => fetchNextPage(),
    enabled: hasNextPage && !isFetchingNextPage,
  });

  // DaySpectrum과 같은 쿼리 키라 react-query가 합쳐 준다(추가 요청 없음).
  const { data: stats } = useQuery({
    queryKey: ["cluster-stats", outletIds.join(","), date ?? ""],
    queryFn: () => fetchClusterStats(outletIds, date),
  });

  const clusters = data?.pages.flatMap((p) => p.items) ?? [];
  const { covered, solo } = partitionBySpread(clusters);

  return (
    <>
      <DaySpectrum outletIds={outletIds} date={date} />

      <section>
        <div className={styles.listHead}>
          <span>이슈 {stats ? stats.clusterCount.toLocaleString() : "—"}</span>
          <span>중도 기준 · ±{TILT_BALANCE_THRESHOLD}%p 이내는 균형</span>
        </div>

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
            ) : date ? (
              <>
                <p className={styles.emptyTitle}>이 날짜에는 수집된 이슈가 없습니다.</p>
                <p className={styles.emptyHint}>다른 날짜를 선택해 보세요.</p>
              </>
            ) : (
              <>
                <p className={styles.emptyTitle}>데이터가 없습니다.</p>
                <p className={styles.emptyHint}>
                  <code className={styles.code}>npm run collect</code> 로 기사를 수집해주세요.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {covered.length > 0 && (
              <ul className={styles.list}>
                {covered.map((c) => (
                  <li key={c.id}>
                    <ClusterCard cluster={c} />
                  </li>
                ))}
              </ul>
            )}

            {solo.length > 0 && (
              <details className={styles.soloBlock}>
                <summary className={styles.soloSummary}>
                  단독 보도 <b>{solo.length}</b>건
                  <span className={styles.soloHint}>한 매체만 다룬 이슈 · 비교 대상 없음</span>
                </summary>
                <ul className={styles.soloList}>
                  {solo.map((c) => (
                    <li key={c.id}>
                      <Link href={`/clusters/${c.id}`} className={styles.soloItem}>
                        <span className={styles.soloTitle}>{c.representativeTitle}</span>
                        <span className={styles.soloCount}>{c.articleCount}건</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {isFetchingNextPage && <SkeletonList />}
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
            {!hasNextPage && <p className={styles.status}>모든 이슈를 불러왔습니다</p>}
          </>
        )}
      </section>
    </>
  );
}
