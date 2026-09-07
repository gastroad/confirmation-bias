import { LeaningBar, TiltLabel } from "@/entities/outlet/@x/cluster";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
import type { ClusterSummary } from "../model";
import * as styles from "./ClusterCard.css";

interface Props {
  cluster: ClusterSummary;
  /** 여러 날짜가 섞이는 목록(주간 리포트)에서만 날짜를 함께 적는다. */
  showDate?: boolean;
  /** 단위(%p)까지 적을지 → entities/outlet의 TiltLabel */
  showTiltUnit?: boolean;
  /** 바깥 목록이 지면의 어느 깊이에 놓이느냐로 정한다. */
  headingLevel?: 3 | 4;
}

/**
 * 한 이슈를 **제목 → 성향 막대 → 수치 한 줄**로 세운다. 날짜별 목록(widgets/cluster-feed)과
 * 주간 리포트(app/weekly)가 이걸 같이 쓴다 — 각자 그리던 동안 글자 크기·색·간격이 조금씩
 * 갈려 같은 이슈가 두 화면에서 다른 무게로 읽혔다.
 *
 * 바깥 껍데기(카드의 중심선·리포트 행의 순위 열)는 **여기 없다.** 막대의 중심선을 관통시킬지는
 * 그 목록이 무엇을 주장하는지에 달렸고, 이 컴포넌트가 정할 일이 아니다 →
 * docs/agent/architecture.md의 "중심선(meridian)".
 *
 * 성향 막대·편중 라벨은 outlet 엔티티의 것이다. `ClusterSummary`가 이미 `LeaningDistribution`을
 * 품고 있어 cluster는 outlet 없이는 그려지지 않는다.
 */
export function ClusterCard({
  cluster,
  showDate = false,
  showTiltUnit = false,
  headingLevel = 3,
}: Props) {
  const Title = headingLevel === 4 ? "h4" : "h3";

  return (
    <div className={styles.root}>
      <Title className={styles.title}>{cluster.representativeTitle}</Title>
      <LeaningBar distribution={cluster.leaningDistribution} />

      <div className={styles.meta}>
        <span>
          {showDate && `${formatBucketDateShort(cluster.bucketDate)} · `}
          <em className={styles.num}>{cluster.articleCount}</em>건 ·{" "}
          <em className={styles.num}>{cluster.outletCount}</em>개사
        </span>
        <TiltLabel tilt={cluster.tilt} showUnit={showTiltUnit} />
      </div>
    </div>
  );
}
