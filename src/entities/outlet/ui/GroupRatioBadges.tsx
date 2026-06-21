import { LEANING_GROUP_LABELS } from "../model";
import type { LeaningGroupRatios } from "../model";
import * as styles from "./GroupRatioBadges.css";

interface Props {
  ratios: LeaningGroupRatios;
}

const GROUP_ORDER = ["conservative", "neutral", "progressive"] as const;

export function GroupRatioBadges({ ratios }: Props) {
  return (
    <div className={styles.root}>
      {GROUP_ORDER.map((key) => {
        const pct = ratios[key];
        if (pct === 0) return null;
        return (
          <span key={key} className={styles.badge[key]}>
            {LEANING_GROUP_LABELS[key]} {(pct * 100).toFixed(0)}%
          </span>
        );
      })}
    </div>
  );
}
