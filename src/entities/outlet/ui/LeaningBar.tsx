"use client";

import { calcBarGeometry, LEANING_LABELS } from "../model";
import type { LeaningDistribution } from "../model";
import { LEANING_COLORS } from "../leaning-colors";
import * as styles from "./LeaningBar.css";

interface Props {
  distribution: LeaningDistribution;
  showLabels?: boolean;
  /** 하루 전체 분포처럼 화면의 주장이 되는 자리에서 쓴다 */
  large?: boolean;
}

/**
 * 성향 분포를 중심선 기준으로 그린다.
 *
 * 기하 계산은 `calcBarGeometry`에 있다(브라우저 없이 검증하려고 JSX 밖으로 뺐다).
 * 여기서는 그 값을 인라인 스타일로 옮기기만 한다 — **`transform-origin`을 `center`로
 * 두면 안 된다.** 막대의 기하학적 중심과 중도 중점은 다르다.
 */
export function LeaningBar({ distribution, showLabels = false, large = false }: Props) {
  const geometry = calcBarGeometry(distribution);
  if (!geometry) return <div className={styles.empty} />;

  const { midpoint, left, segments } = geometry;

  return (
    <div className={styles.root}>
      <div className={large ? styles.trackLarge : styles.track}>
        <span className={styles.rail} />
        <div
          className={styles.bar}
          style={{ left: `${left}%`, transformOrigin: `${midpoint}% center` }}
        >
          {segments.map(({ leaning, count, percent }) => (
            <div
              key={leaning}
              className={styles.segment}
              style={{ width: `${percent}%`, backgroundColor: LEANING_COLORS[leaning] }}
              title={`${LEANING_LABELS[leaning]}: ${count}건 (${percent.toFixed(0)}%)`}
            />
          ))}
        </div>
      </div>

      {showLabels && (
        <div className={styles.labels}>
          {segments.map(({ leaning, count }) => (
            <span key={leaning} className={styles.labelItem}>
              <span className={styles.dot} style={{ backgroundColor: LEANING_COLORS[leaning] }} />
              {LEANING_LABELS[leaning]} {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
