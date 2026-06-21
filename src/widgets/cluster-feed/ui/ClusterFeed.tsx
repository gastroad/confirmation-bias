import Link from "next/link";
import { LeaningBar, GroupRatioBadges, emptyDistribution, LEANING_LABELS } from "@/entities/outlet";
import type { Leaning } from "@/entities/outlet";
import type { ClusterSummary } from "@/entities/cluster";
import { formatRelative } from "@/shared/lib/format";
import * as styles from "./ClusterFeed.css";

interface Props {
  clusters: ClusterSummary[];
  isFiltered?: boolean;
}

function StatsBar({ clusters }: { clusters: ClusterSummary[] }) {
  const totalArticles = clusters.reduce((s, c) => s + c.articleCount, 0);

  const totalDist = emptyDistribution();
  for (const c of clusters) {
    for (const [k, v] of Object.entries(c.leaningDistribution) as [Leaning, number][]) {
      totalDist[k] += v;
    }
  }

  const dominantLeaning = (Object.entries(totalDist) as [Leaning, number][])
    .filter(([k]) => k !== "unknown")
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  return (
    <div className={styles.stats}>
      <div className={styles.statCell}>
        <p className={styles.statValue}>{clusters.length}</p>
        <p className={styles.statLabel}>이슈 클러스터</p>
      </div>
      <div className={styles.statCellDivided}>
        <p className={styles.statValue}>{totalArticles}</p>
        <p className={styles.statLabel}>수집 기사</p>
      </div>
      <div className={styles.statCell}>
        <p className={styles.statValue}>
          {dominantLeaning ? LEANING_LABELS[dominantLeaning] : "—"}
        </p>
        <p className={styles.statLabel}>최다 보도 성향</p>
      </div>
    </div>
  );
}

export function ClusterFeed({ clusters, isFiltered = false }: Props) {
  if (clusters.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <StatsBar clusters={clusters} />

      <section>
        <h2 className={styles.sectionTitle}>이슈 목록 ({clusters.length})</h2>
        <ul className={styles.list}>
          {clusters.map((c) => (
            <li key={c.id}>
              <Link href={`/clusters/${c.id}`} className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>{c.representativeTitle}</h3>
                  <span className={styles.cardTime}>{formatRelative(c.latestPublishedAt)}</span>
                </div>

                <LeaningBar distribution={c.leaningDistribution} />

                <div className={styles.cardFooter}>
                  <GroupRatioBadges ratios={c.leaningGroupRatios} />
                  <span className={styles.cardCount}>{c.articleCount}건</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
