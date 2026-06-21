import type { LeaningGroup, LeaningGroupRatios } from "../model";
import * as styles from "./GroupRatioBadges.css";

interface Props {
  ratios: LeaningGroupRatios;
}

const GROUP_CONFIG: { key: LeaningGroup; label: string }[] = [
  { key: "conservative", label: "보수" },
  { key: "neutral", label: "중도" },
  { key: "progressive", label: "진보" },
];

export function GroupRatioBadges({ ratios }: Props) {
  return (
    <div className={styles.root}>
      {GROUP_CONFIG.map(({ key, label }) => {
        const pct = ratios[key];
        if (pct === 0) return null;
        return (
          <span key={key} className={styles.badge[key]}>
            {label} {(pct * 100).toFixed(0)}%
          </span>
        );
      })}
    </div>
  );
}
