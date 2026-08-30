export type Leaning = "left" | "center_left" | "center" | "center_right" | "right" | "unknown";

export type LeaningGroup = "conservative" | "neutral" | "progressive";

export type LeaningDistribution = Record<Leaning, number>;

export type LeaningGroupRatios = Record<LeaningGroup, number>;

export interface OutletMetadata {
  id: string;
  name: string;
  domain: string;
  leaning: Leaning;
  leaningLabel: string;
}

export const OUTLETS: OutletMetadata[] = [
  { id: "chosun", name: "조선일보", domain: "chosun.com", leaning: "right", leaningLabel: "보수" },
  { id: "segye", name: "세계일보", domain: "segye.com", leaning: "right", leaningLabel: "보수" },
  { id: "cheonji", name: "천지일보", domain: "newscj.com", leaning: "right", leaningLabel: "보수" },
  {
    id: "hankyung",
    name: "한국경제",
    domain: "hankyung.com",
    leaning: "right",
    leaningLabel: "보수",
  },
  {
    id: "donga",
    name: "동아일보",
    domain: "donga.com",
    leaning: "center_right",
    leaningLabel: "중도보수",
  },
  {
    id: "asiae",
    name: "아시아경제",
    domain: "asiae.co.kr",
    leaning: "center_right",
    leaningLabel: "중도보수",
  },
  { id: "yonhap", name: "연합뉴스", domain: "yna.co.kr", leaning: "center", leaningLabel: "중도" },
  { id: "newsis", name: "뉴시스", domain: "newsis.com", leaning: "center", leaningLabel: "중도" },
  { id: "seoul", name: "서울신문", domain: "seoul.co.kr", leaning: "center", leaningLabel: "중도" },
  { id: "sbs", name: "SBS", domain: "sbs.co.kr", leaning: "center", leaningLabel: "중도" },
  {
    id: "sisajournal",
    name: "시사저널",
    domain: "sisajournal.com",
    leaning: "center",
    leaningLabel: "중도",
  },
  {
    id: "khan",
    name: "경향신문",
    domain: "khan.co.kr",
    leaning: "center_left",
    leaningLabel: "중도진보",
  },
  { id: "hani", name: "한겨레신문", domain: "hani.co.kr", leaning: "left", leaningLabel: "진보" },
  {
    id: "ohmynews",
    name: "오마이뉴스",
    domain: "ohmynews.com",
    leaning: "left",
    leaningLabel: "진보",
  },
  {
    id: "mediatoday",
    name: "미디어오늘",
    domain: "mediatoday.co.kr",
    leaning: "left",
    leaningLabel: "진보",
  },
  { id: "sisain", name: "시사인", domain: "sisain.co.kr", leaning: "left", leaningLabel: "진보" },
  {
    id: "pressian",
    name: "프레시안",
    domain: "pressian.com",
    leaning: "left",
    leaningLabel: "진보",
  },
  {
    id: "womennews",
    name: "여성신문",
    domain: "womennews.co.kr",
    leaning: "left",
    leaningLabel: "진보",
  },
];

export const OUTLET_MAP: Record<string, OutletMetadata> = Object.fromEntries(
  OUTLETS.map((o) => [o.id, o])
);

export const LEANING_GROUPS: Record<LeaningGroup, Leaning[]> = {
  conservative: ["right", "center_right"],
  neutral: ["center"],
  progressive: ["left", "center_left"],
};

export const LEANING_GROUP_LABELS: Record<LeaningGroup, string> = {
  conservative: "보수",
  neutral: "중도",
  progressive: "진보",
};

// 진보 → 중도 → 보수 (LeaningBar의 좌→우 스펙트럼과 동일한 순서)
export const LEANING_GROUP_ORDER: LeaningGroup[] = ["progressive", "neutral", "conservative"];

/**
 * leaning → 진영 그룹의 역방향 매핑. `unknown`은 어느 그룹에도 속하지 않아 **키 자체가 없다**
 * (그룹 수를 셀 때 "미분류"가 한 진영처럼 잡히면 안 된다).
 */
export const GROUP_BY_LEANING: Record<string, LeaningGroup> = Object.fromEntries(
  LEANING_GROUP_ORDER.flatMap((g) => LEANING_GROUPS[g].map((l) => [l, g]))
);

export const OUTLETS_BY_GROUP: Record<LeaningGroup, OutletMetadata[]> = {
  conservative: OUTLETS.filter((o) => LEANING_GROUPS.conservative.includes(o.leaning)),
  neutral: OUTLETS.filter((o) => LEANING_GROUPS.neutral.includes(o.leaning)),
  progressive: OUTLETS.filter((o) => LEANING_GROUPS.progressive.includes(o.leaning)),
};

export const LEANING_LABELS: Record<Leaning, string> = {
  left: "진보",
  center_left: "중도진보",
  center: "중도",
  center_right: "중도보수",
  right: "보수",
  unknown: "미분류",
};

export const LEANING_ORDER: Leaning[] = [
  "left",
  "center_left",
  "center",
  "center_right",
  "right",
  "unknown",
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
    neutral: sum(LEANING_GROUPS.neutral) / total,
    progressive: sum(LEANING_GROUPS.progressive) / total,
  };
}

/**
 * 진보 비율 − 보수 비율 (백분율 포인트). 양수면 진보 쪽으로 더 많이 보도됐다는 뜻.
 * 중심선 기준 막대가 어느 쪽으로 튀어나왔는지를 수치로 옮긴 값이다.
 */
export function calcTilt(ratios: LeaningGroupRatios): number {
  return (ratios.progressive - ratios.conservative) * 100;
}

/**
 * 이 폭 안이면 "균형"으로 본다. 디자인이 아니라 서비스의 주장이므로 한 곳에만 둔다.
 * 화면에도 이 기준을 그대로 노출한다(클러스터 목록 헤더).
 */
export const TILT_BALANCE_THRESHOLD = 5;

export interface BarSegment {
  leaning: Leaning;
  count: number;
  /** 막대 안에서 차지하는 폭(%). 세그먼트 합은 100이다. */
  percent: number;
}

export interface BarGeometry {
  /**
   * 막대 안에서 중도 구간의 중점이 놓인 위치(%). 이것이 **중심선**이고,
   * 진입 애니메이션이 자라는 지점(`transform-origin`의 x좌표)이기도 하다.
   */
  midpoint: number;
  /** 트랙 좌측에서 막대가 시작하는 위치(%). */
  left: number;
  /** 0건인 성향은 빠진다. 진보 → 보수 순(LEANING_ORDER). */
  segments: BarSegment[];
}

/**
 * 성향 분포를 중심선 기준 막대의 기하로 옮긴다. 기사가 없으면 null(빈 레일).
 *
 * 막대는 폭이 아니라 **위치**로 말한다 — 중도 구간의 중점이 항상 트랙 한가운데(50%)에
 * 놓이므로, 한쪽으로 튀어나온 길이가 곧 그 이슈의 편향이다. 목록에서 여러 막대가 같은
 * 세로선을 공유하면 위아래 이슈가 서로 직접 비교된다.
 *
 * ```
 * midpoint = 진보% + 중도%/2       ← 막대 안에서 중도 중점의 위치
 * left     = 50 − midpoint × 0.5   ← 트랙 좌측에서의 시작점
 * ```
 *
 * `× 0.5`는 **막대가 트랙 폭의 50%만 차지하기 때문이다**(한쪽으로 100% 쏠려도 잘리지 않는
 * 최대 폭). 그래서 `left + midpoint × 0.5`는 어떤 분포에서도 50이 된다.
 *
 * 계산이 JSX 밖에 있는 이유: 이 기하가 이 서비스의 시각적 주장이라 브라우저 없이도
 * 검증할 수 있어야 한다. → docs/agent/architecture.md의 "중심선(meridian)"
 */
export function calcBarGeometry(dist: LeaningDistribution): BarGeometry | null {
  const total = Object.values(dist).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const percentOf = (leaning: Leaning) => (dist[leaning] / total) * 100;
  const sumOf = (leanings: Leaning[]) => leanings.reduce((s, l) => s + percentOf(l), 0);

  const midpoint = sumOf(LEANING_GROUPS.progressive) + sumOf(LEANING_GROUPS.neutral) / 2;

  return {
    midpoint,
    left: 50 - midpoint * 0.5,
    segments: LEANING_ORDER.filter((l) => dist[l] > 0).map((leaning) => ({
      leaning,
      count: dist[leaning],
      percent: percentOf(leaning),
    })),
  };
}

export type TiltSide = "progressive" | "conservative" | "balanced";

export function tiltSide(tilt: number): TiltSide {
  if (Math.abs(tilt) < TILT_BALANCE_THRESHOLD) return "balanced";
  return tilt > 0 ? "progressive" : "conservative";
}

/**
 * 언론사별 집계. **전부 우리가 계산한 값이고 원문 복제가 0이다** —
 * 언론사 페이지를 만드는 이유가 그것이다. → docs/agent/adsense-compliance.md
 */
export interface OutletStats {
  outletId: string;
  articleCount: number;
  clusterCount: number;
  /** 이 매체 말고 아무도 다루지 않은 이슈 수. */
  soloCount: number;
  /** 이 매체가 가장 먼저 보도한 이슈 수. */
  firstMoverCount: number;
  /** "YYYY-MM-DD". 기사가 없으면 null. */
  firstDate: string | null;
  lastDate: string | null;
}

/** 같은 이슈를 함께 다룬 횟수. "누구와 의제가 겹치는가". */
export interface OutletOverlap {
  outletId: string;
  sharedClusters: number;
}

export interface OutletDailyPoint {
  /** "YYYY-MM-DD" */
  date: string;
  count: number;
}

export interface OutletClusterRef {
  id: string;
  title: string;
  bucketDate: string;
  articleCount: number;
}

export interface OutletProfile {
  outlet: OutletMetadata;
  stats: OutletStats;
  overlaps: OutletOverlap[];
  daily: OutletDailyPoint[];
  recentClusters: OutletClusterRef[];
}
