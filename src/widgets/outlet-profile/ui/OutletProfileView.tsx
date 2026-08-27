import Link from "next/link";
import { LEANING_COLORS, OUTLET_MAP, buildOutletSummary, ratioPercent } from "@/entities/outlet";
import type { OutletProfile } from "@/entities/outlet";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
import { OutletVolumeChart } from "./OutletVolumeChart";
import * as styles from "./OutletProfileView.css";

interface Props {
  profile: OutletProfile;
  /** 추이 차트가 덮는 기간(일). 캡션에 그대로 적는다. */
  trendDays: number;
}

export function OutletProfileView({ profile, trendDays }: Props) {
  const { outlet, stats, overlaps, daily, recentClusters } = profile;
  const maxShared = overlaps[0]?.sharedClusters ?? 0;

  return (
    <div className={styles.root}>
      <section className={styles.head}>
        <span className={styles.badge}>
          <span
            className={styles.dot}
            style={{ background: LEANING_COLORS[outlet.leaning] }}
            aria-hidden
          />
          {outlet.leaningLabel}
        </span>
        <h2 className={styles.name}>{outlet.name}</h2>
        <p className={styles.domain}>{outlet.domain}</p>
        <p className={styles.summary}>{buildOutletSummary(profile)}</p>
      </section>

      <section className={styles.section}>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>수집 기사</div>
            <div className={styles.statValue}>{stats.articleCount.toLocaleString()}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>등장한 이슈</div>
            <div className={styles.statValue}>{stats.clusterCount.toLocaleString()}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>단독 보도</div>
            <div className={styles.statValue}>{stats.soloCount.toLocaleString()}</div>
            <div className={styles.statNote}>
              전체 이슈의 {ratioPercent(stats.soloCount, stats.clusterCount)}%
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>최초 보도</div>
            <div className={styles.statValue}>{stats.firstMoverCount.toLocaleString()}</div>
            <div className={styles.statNote}>
              전체 이슈의 {ratioPercent(stats.firstMoverCount, stats.clusterCount)}%
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>최근 {trendDays}일 보도량</h3>
        <OutletVolumeChart data={daily} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>같은 이슈를 자주 함께 다룬 매체</h3>
        {overlaps.length === 0 ? (
          <p className={styles.empty}>다른 매체와 겹친 이슈가 없습니다.</p>
        ) : (
          <div className={styles.overlapList}>
            {overlaps.map((o) => {
              const other = OUTLET_MAP[o.outletId];
              return (
                <div key={o.outletId} className={styles.overlapRow}>
                  <span className={styles.overlapName}>{other?.name ?? o.outletId}</span>
                  <span className={styles.overlapTrack}>
                    <span
                      className={styles.overlapFill}
                      style={{
                        width: `${maxShared === 0 ? 0 : (o.sharedClusters / maxShared) * 100}%`,
                        background: other ? LEANING_COLORS[other.leaning] : undefined,
                      }}
                    />
                  </span>
                  <span className={styles.overlapCount}>{o.sharedClusters.toLocaleString()}건</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>이 매체가 참여한 최근 이슈</h3>
        {recentClusters.length === 0 ? (
          <p className={styles.empty}>
            여러 진영이 함께 다룬 이슈가 아직 없습니다. 단독 보도는 날짜별 목록에서 볼 수 있습니다.
          </p>
        ) : (
          <div className={styles.issueList}>
            {recentClusters.map((c) => (
              <Link key={c.id} href={`/clusters/${c.id}`} className={styles.issue}>
                <span className={styles.issueTitle}>{c.title}</span>
                <span className={styles.issueMeta}>
                  {formatBucketDateShort(c.bucketDate)} · {c.articleCount}건
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
