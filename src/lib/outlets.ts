import type { Leaning, LeaningDistribution, LeaningGroup, LeaningGroupRatios, OutletMetadata } from "@/types";

export const OUTLETS: OutletMetadata[] = [
  { id: "chosun",   name: "조선일보", domain: "chosun.com",     leaning: "right",        leaningLabel: "보수" },
  { id: "joongang", name: "중앙일보", domain: "joongang.co.kr", leaning: "center_right", leaningLabel: "중도보수" },
  { id: "donga",    name: "동아일보", domain: "donga.com",      leaning: "center_right", leaningLabel: "중도보수" },
  { id: "hani",     name: "한겨레",   domain: "hani.co.kr",     leaning: "left",         leaningLabel: "진보" },
  { id: "khan",     name: "경향신문", domain: "khan.co.kr",     leaning: "center_left",  leaningLabel: "중도진보" },
  { id: "yonhap",   name: "연합뉴스", domain: "yna.co.kr",      leaning: "center",       leaningLabel: "중도" },
  { id: "news1",    name: "뉴스1",    domain: "news1.kr",       leaning: "center",       leaningLabel: "중도" },
  { id: "newsis",   name: "뉴시스",   domain: "newsis.com",     leaning: "center",       leaningLabel: "중도" },
];

export const OUTLET_MAP: Record<string, OutletMetadata> = Object.fromEntries(
  OUTLETS.map((o) => [o.id, o])
);

export const LEANING_GROUPS: Record<LeaningGroup, Leaning[]> = {
  conservative: ["right", "center_right"],
  neutral:      ["center"],
  progressive:  ["left", "center_left"],
};

export const LEANING_LABELS: Record<Leaning, string> = {
  left:         "진보",
  center_left:  "중도진보",
  center:       "중도",
  center_right: "중도보수",
  right:        "보수",
  unknown:      "미분류",
};

export const LEANING_COLORS: Record<Leaning, string> = {
  left:         "#3b82f6",
  center_left:  "#93c5fd",
  center:       "#9ca3af",
  center_right: "#fca5a5",
  right:        "#ef4444",
  unknown:      "#e5e7eb",
};

export const LEANING_ORDER: Leaning[] = [
  "left", "center_left", "center", "center_right", "right", "unknown",
];

export function emptyDistribution(): LeaningDistribution {
  return { left: 0, center_left: 0, center: 0, center_right: 0, right: 0, unknown: 0 };
}

export function calcLeaningGroupRatios(dist: LeaningDistribution): LeaningGroupRatios {
  const total = Object.values(dist).reduce((s, n) => s + n, 0);
  if (total === 0) return { conservative: 0, neutral: 0, progressive: 0 };

  const sum = (keys: Leaning[]) => keys.reduce((s, k) => s + dist[k], 0);
  return {
    conservative: sum(LEANING_GROUPS.conservative) / total,
    neutral:      sum(LEANING_GROUPS.neutral) / total,
    progressive:  sum(LEANING_GROUPS.progressive) / total,
  };
}
