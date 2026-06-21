import {
  LeaningBar,
  GroupRatioBadges,
  LEANING_ORDER,
  LEANING_COLORS,
  LEANING_LABELS,
} from "@/entities/outlet";
import { TimelineChart } from "@/entities/cluster";
import type { ClusterDetail } from "@/entities/cluster";
import { formatDate } from "@/shared/lib/format";
import * as styles from "./ClusterDetailView.css";

interface Props {
  cluster: ClusterDetail;
}

export function ClusterDetailView({ cluster }: Props) {
  const total = Object.values(cluster.leaningDistribution).reduce((s, n) => s + n, 0);

  const articlesByLeaning = LEANING_ORDER.flatMap((leaning) =>
    cluster.articles.filter((a) => a.outlet.leaning === leaning)
  );

  return (
    <main className={styles.main}>
      <section>
        <h2 className={styles.title}>{cluster.representativeTitle}</h2>
        {cluster.summary && <p className={styles.summary}>{cluster.summary}</p>}
        <p className={styles.meta}>기사 {cluster.articleCount}건</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>매체 성향 분포</h3>
        <LeaningBar distribution={cluster.leaningDistribution} showLabels />
        <GroupRatioBadges ratios={cluster.leaningGroupRatios} />

        <div className={styles.statGrid}>
          {LEANING_ORDER.map((leaning) => {
            const count = cluster.leaningDistribution[leaning];
            if (count === 0) return null;
            return (
              <div key={leaning} className={styles.statBox}>
                <div className={styles.statBoxHead}>
                  <span
                    className={styles.dot}
                    style={{ backgroundColor: LEANING_COLORS[leaning] }}
                  />
                  <span className={styles.statBoxLabel}>{LEANING_LABELS[leaning]}</span>
                </div>
                <p className={styles.statBoxValue}>{count}</p>
                <p className={styles.statBoxPct}>{((count / total) * 100).toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>시간대별 보도량</h3>
        <TimelineChart data={cluster.timeline} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>언론사별 기사 제목</h3>
        <ul className={styles.articleList}>
          {articlesByLeaning.map((a) => (
            <li key={a.id} className={styles.articleItem}>
              <div className={styles.articleDotWrap}>
                <span
                  className={styles.articleDot}
                  style={{ backgroundColor: LEANING_COLORS[a.outlet.leaning] }}
                />
              </div>
              <div className={styles.articleBody}>
                <div className={styles.articleMeta}>
                  <span className={styles.outletName}>{a.outlet.name}</span>
                  <span className={styles.outletLeaning}>{a.outlet.leaningLabel}</span>
                  <span className={styles.articleDate}>{formatDate(a.publishedAt)}</span>
                </div>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.articleLink}
                >
                  {a.title}
                </a>
                {a.description && <p className={styles.articleDesc}>{a.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
