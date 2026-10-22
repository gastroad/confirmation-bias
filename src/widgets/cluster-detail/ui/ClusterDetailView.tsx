import Link from "next/link";
import {
  LeaningBar,
  LEANING_GROUP_LABELS,
  LEANING_COLORS,
  OUTLET_ARTICLE_CAP,
  calcTilt,
  tiltSide,
} from "@/entities/outlet";
import type { Leaning, LeaningGroup } from "@/entities/outlet";
import { LagStrip } from "./LagStrip";
import { groupArticlesByLeaning, calcLagGeometry, findCappedOutlets } from "@/entities/cluster";
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

/**
 * 상한에 걸린 매체를 밝힌다. 막대 라벨은 반영 기사 수라 아래 세 열의 건수와 다를 수 있고,
 * 그 차이를 독자가 계산해 내게 두면 수치를 믿을 근거가 사라진다.
 */
function CapNote({ cluster }: { cluster: ClusterDetail }) {
  const capped = findCappedOutlets(cluster.articles);
  if (capped.length === 0) return null;

  const list = capped.map((c) => `${c.outletName} ${c.articles}건`).join(" · ");
  return (
    <p className={styles.capNote}>
      한 매체는 한 사건에서 최대 {OUTLET_ARTICLE_CAP}건까지만 셉니다. 이 사건에서는 {list}을{" "}
      {capped.length > 1 && "각각 "}
      {OUTLET_ARTICLE_CAP}건으로 셌습니다(반영 {cluster.countedArticleCount}건 / 수집{" "}
      {cluster.articleCount}건). <Link href="/about#tilt">계산 방법</Link>
    </p>
  );
}

export function ClusterDetailView({ cluster }: Props) {
  const byGroup = groupArticlesByLeaning(cluster.articles);
  const lag = calcLagGeometry(cluster.articles);

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
        <CapNote cluster={cluster} />
      </section>

      {lag.first && (
        <section className={styles.section}>
          <h3 className={styles.heading}>보도 시차</h3>
          <LagStrip lag={lag} />
        </section>
      )}

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
    </div>
  );
}
