import type { LeaningGroupRatios } from "../model";

interface Props {
  ratios: LeaningGroupRatios;
}

const GROUP_CONFIG = [
  { key: "conservative" as const, label: "보수", color: "bg-red-100 text-red-700" },
  { key: "neutral"      as const, label: "중도", color: "bg-zinc-100 text-zinc-600" },
  { key: "progressive"  as const, label: "진보", color: "bg-blue-100 text-blue-700" },
];

export function GroupRatioBadges({ ratios }: Props) {
  return (
    <div className="flex gap-2">
      {GROUP_CONFIG.map(({ key, label, color }) => {
        const pct = ratios[key];
        if (pct === 0) return null;
        return (
          <span key={key} className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
            {label} {(pct * 100).toFixed(0)}%
          </span>
        );
      })}
    </div>
  );
}
