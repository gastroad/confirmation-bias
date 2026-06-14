"use client";

import { LEANING_ORDER, LEANING_COLORS, LEANING_LABELS } from "../model";
import type { LeaningDistribution } from "../model";

interface Props {
  distribution: LeaningDistribution;
  showLabels?: boolean;
}

export function LeaningBar({ distribution, showLabels = false }: Props) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0);
  if (total === 0) return <div className="h-2 rounded bg-zinc-100" />;

  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
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
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {LEANING_ORDER.map((leaning) => {
            const count = distribution[leaning];
            if (count === 0) return null;
            return (
              <span key={leaning} className="flex items-center gap-1 text-xs text-zinc-500">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: LEANING_COLORS[leaning] }}
                />
                {LEANING_LABELS[leaning]} {count}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
