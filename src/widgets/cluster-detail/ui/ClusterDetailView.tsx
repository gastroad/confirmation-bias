import {
  LeaningBar,
  LEANING_GROUP_LABELS,
  LEANING_COLORS,
  calcTilt,
  tiltSide,
} from "@/entities/outlet";
import type { Leaning, LeaningGroup } from "@/entities/outlet";
import { TimelineChart } from "./TimelineChart";
import { groupArticlesByLeaning } from "@/entities/cluster";
import type { ClusterDetail } from "@/entities/cluster";
import { formatDate } from "@/shared/lib/format";
import { formatBucketDateNumeric } from "@/shared/lib/bucket-date";
import * as styles from "./ClusterDetailView.css";

interface Props {
  cluster: ClusterDetail;
}

/** 그룹의 대표색. 열 머리에 얇은 띠로 얹어 어느 진영의 열인지 표시한다. */
const GROUP_ACCENT: Record<LeaningGroup, Leaning> = {
  progressive: "left",
  neutral: "center",
  conservative: "right",
};

function Verdict({ cluster }: { cluster: ClusterDetail }) {
  const tilt = calcTilt(cluster.leaningGroupRatios);
  const side = tiltSide(tilt);

  if (side === "balanced") {
    return (
      <p className={styles.verdict}>
        진영 간 보도량이 <b>균형</b>에 가깝습니다. 어느 쪽도 이 사건을 더 크게 다루지 않았습니다.
      </p>
    );
  }

  const name = LEANING_GROUP_LABELS[side];
  const other =
    side === "progressive" ? LEANING_GROUP_LABELS.conservative : LEANING_GROUP_LABELS.progressive;

  return (
    <p className={styles.verdict}>
      {name} 매체가 {other}보다 <b>{Math.abs(tilt).toFixed(1)}%p</b> 많이 보도했습니다. 아래 세 열의
      제목을 나란히 읽으면 같은 사건을 어떻게 다르게 세웠는지 보입니다.
    </p>
  );
}

export function ClusterDetailView({ cluster }: Props) {
  const byGroup = groupArticlesByLeaning(cluster.articles);

  return (
    <div className={styles.root}>
      <section className={styles.head}>
        <p className={styles.subline}>
          {formatBucketDateNumeric(cluster.bucketDate)} · {cluster.articleCount}건 ·{" "}
          {cluster.outletCount}개 언론사
        </p>
        <h2 className={styles.title}>{cluster.representativeTitle}</h2>
        {cluster.summary && <p className={styles.summary}>{cluster.summary}</p>}
      </section>

      <section className={styles.section}>
        <LeaningBar distribution={cluster.leaningDistribution} showLabels large />
        <Verdict cluster={cluster} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>같은 사건, 세 갈래 제목</h3>
        <div className={styles.columns}>
          {byGroup.map(({ group, articles, outletCount }) => (
            <div key={group} className={styles.column}>
              <div
                className={styles.columnHead}
                style={{ boxShadow: `inset 0 3px 0 ${LEANING_COLORS[GROUP_ACCENT[group]]}` }}
              >
                <span className={styles.columnName}>{LEANING_GROUP_LABELS[group]}</span>
                <span className={styles.columnCount}>
                  {articles.length}건 · {outletCount}개사
                </span>
              </div>

              {articles.length === 0 ? (
                <p className={styles.columnEmpty}>보도 없음</p>
              ) : (
                articles.map((a) => (
                  <div key={a.id} className={styles.article}>
                    <span className={styles.articleMeta}>
                      <span className={styles.outletName}>{a.outlet.name}</span>
                      <span className={styles.articleTime}>{formatDate(a.publishedAt)}</span>
                    </span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.articleLink}
                    >
                      {a.title}
                    </a>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>시간대별 보도량</h3>
        <div className={styles.chart}>
          <TimelineChart data={cluster.timeline} />
        </div>
      </section>
    </div>
  );
}
