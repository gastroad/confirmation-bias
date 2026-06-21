"use client";

import { LEANING_ORDER, LEANING_COLORS, LEANING_LABELS } from "../model";
import type { LeaningDistribution } from "../model";
import * as styles from "./LeaningBar.css";

interface Props {
  distribution: LeaningDistribution;
  showLabels?: boolean;
}

export function LeaningBar({ distribution, showLabels = false }: Props) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0);
  if (total === 0) return <div className={styles.empty} />;

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        {LEANING_ORDER.map((leaning) => {
          const count = distribution[leaning];
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={leaning}
              style={{ width: `${pct}%`, backgroundColor: LEANING_COLORS[leaning] }}
              title={`${LEANING_LABELS[leaning]}: ${count}건 (${pct.toFixed(0)}%)`}
            />
          );
        })}
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
