"use client";

import { LEANING_ORDER, LEANING_GROUPS, LEANING_LABELS } from "../model";
import type { Leaning, LeaningDistribution } from "../model";
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
 * 막대는 폭이 아니라 **위치**로 말한다. 중도 구간의 중점이 항상 트랙 한가운데에
 * 놓이므로 한쪽으로 튀어나온 길이가 곧 그 이슈의 편향이고, 목록에서 여러 막대가
 * 같은 세로선을 공유하면 위아래 이슈가 서로 직접 비교된다.
 */
export function LeaningBar({ distribution, showLabels = false, large = false }: Props) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0);
  if (total === 0) return <div className={styles.empty} />;

  const pct = (leaning: Leaning) => (distribution[leaning] / total) * 100;

  const progressive = LEANING_GROUPS.progressive.reduce((s, l) => s + pct(l), 0);
  const neutral = LEANING_GROUPS.neutral.reduce((s, l) => s + pct(l), 0);

  // 막대는 트랙의 50%만 차지한다. 중도 중점을 트랙 50%에 맞추려면 그만큼 왼쪽으로 민다.
  const midpoint = progressive + neutral / 2;

  return (
    <div className={styles.root}>
      <div className={large ? styles.trackLarge : styles.track}>
        <span className={styles.rail} />
        <div
          className={styles.bar}
          style={{ left: `${50 - midpoint * 0.5}%`, transformOrigin: `${midpoint}% center` }}
        >
          {LEANING_ORDER.map((leaning) => {
            const count = distribution[leaning];
            if (count === 0) return null;
            return (
              <div
                key={leaning}
                className={styles.segment}
                style={{ width: `${pct(leaning)}%`, backgroundColor: LEANING_COLORS[leaning] }}
                title={`${LEANING_LABELS[leaning]}: ${count}건 (${pct(leaning).toFixed(0)}%)`}
              />
            );
          })}
        </div>
      </div>

      {showLabels && (
        <div className={styles.labels}>
          {LEANING_ORDER.map((leaning) => {
            const count = distribution[leaning];
            if (count === 0) return null;
            return (
              <span key={leaning} className={styles.labelItem}>
                <span className={styles.dot} style={{ backgroundColor: LEANING_COLORS[leaning] }} />
                {LEANING_LABELS[leaning]} {count}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
