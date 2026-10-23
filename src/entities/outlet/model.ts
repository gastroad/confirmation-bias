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
 *
 * 비율의 분모·분자는 **반영 기사 수**다 — 매체 수가 아니고, 수집한 기사 수 그대로도 아니다.
 * `countLeaningDistribution`이 매체당 `OUTLET_ARTICLE_CAP`건까지만 센다.
 */
export function calcTilt(ratios: LeaningGroupRatios): number {
  return (ratios.progressive - ratios.conservative) * 100;
}

/**
 * 한 매체가 **한 이슈에서** 편중 수치에 기여하는 최대 기사 수.
 *
 * 천지일보는 기사의 51%가 포토 기사라(다른 매체는 전부 5% 이하) 국감 하루에 같은 장면의
 * 캡션을 18건씩 낸다. 기사 수를 그대로 세면 매체 3곳짜리 이슈가 "보수 +95%p"가 되고,
 * 2026-10-23 라이브 주간 리포트 편중 TOP10 중 5건이 그런 이슈였다.
 *
 * 3인 이유: (이슈, 매체) 쌍의 91%가 2건 이하이고 3건까지가 본 기사·후속·종합의 통상 범위다.
 * 1로 두면 매체 수를 세는 것과 같아져 "보도량"이라는 지표의 뜻이 사라지고(색인 대상의 57%가
 * 바뀐다), 3이면 4건 이상 몰아 쓴 꼬리(쌍의 5%)만 깎인다(색인 대상의 13%가 바뀐다).
 *
 * 지표를 둘(보도량 편중·매체 참여 편중)로 나누지 않고 이 상한 하나로 왜곡만 걷어낸다 —
 * 막대가 둘이면 카드끼리 같은 중심선으로 비교한다는 주장이 깨진다.
 * → docs/agent/architecture.md의 "중심선(meridian)"
 */
export const OUTLET_ARTICLE_CAP = 3;

/**
 * 한 이슈의 기사들을 성향 분포로 센다. **매체당 `OUTLET_ARTICLE_CAP`건까지만.**
 * 막대의 기하·편중 수치·주간 리포트 선별이 전부 이 분포에서 나온다.
 *
 * 명단에 없는 매체는 `unknown`으로 센다(진영 수를 부풀리지 않는다).
 */
export function countLeaningDistribution(outletIds: readonly string[]): LeaningDistribution {
  const perOutlet = new Map<string, number>();
  for (const id of outletIds) perOutlet.set(id, (perOutlet.get(id) ?? 0) + 1);

  const dist = emptyDistribution();
  for (const [id, n] of perOutlet) {
    dist[OUTLET_MAP[id]?.leaning ?? "unknown"] += Math.min(n, OUTLET_ARTICLE_CAP);
  }
  return dist;
}

export interface TiltMethodVersion {
  version: number;
  /** "YYYY-MM-DD" */
  date: string;
  change: string;
}

/**
 * 편중 수치 정의의 변경 이력. **정의를 바꾸면 맨 앞에 항목을 추가한다.**
 * 방법론 페이지(/about)가 이 목록과 아래 계산 예시를 그대로 그린다.
 *
 * `model.test.ts`의 "편중 수치 정의" 테스트가 예시의 결과를 현재 버전과 함께 못박아 둔다 —
 * 계산을 바꾸고 이력을 남기지 않으면 거기서 깨진다. 예전엔 /about이 "진보 매체 비율 −
 * 보수 매체 비율"이라고 적은 채 코드는 기사 수 비율을 계산하고 있었다(문장은 코드를 따라오지
 * 않는다).
 */
export const TILT_METHOD_VERSIONS: readonly TiltMethodVersion[] = [
  {
    version: 2,
    date: "2026-10-23",
    change: `한 매체가 한 사건에서 기여하는 기사를 최대 ${OUTLET_ARTICLE_CAP}건으로 제한했습니다. 같은 장면의 사진 기사를 연달아 내는 매체 하나가 수치를 좌우하던 문제를 막기 위해서입니다.`,
  },
  {
    version: 1,
    date: "2026-08-25",
    change: "진영별 기사 수 비율의 차이(진보 − 보수)로 편중을 계산하기 시작했습니다.",
  },
];

export const TILT_METHOD_VERSION = TILT_METHOD_VERSIONS[0].version;

/**
 * 방법론 페이지의 계산 예시. 2026-10-23 주간 리포트 1위였던 이슈의 실제 구성이다
 * (천지일보 18건 · 한국경제 1건 · 서울신문 1건). 입력만 여기 두고 결과는 화면이 계산한다.
 */
export const TILT_METHOD_EXAMPLE: readonly { outletId: string; articles: number }[] = [
  { outletId: "cheonji", articles: 18 },
  { outletId: "hankyung", articles: 1 },
  { outletId: "seoul", articles: 1 },
];

export interface TiltWorkedExample {
  rows: {
    outlet: OutletMetadata;
    articles: number;
    counted: number;
  }[];
  totalArticles: number;
  totalCounted: number;
  /** 상한 없이 기사 수를 그대로 셌을 때(버전 1) */
  uncappedTilt: number;
  tilt: number;
  ratios: LeaningGroupRatios;
}

export function workTiltExample(
  example: readonly { outletId: string; articles: number }[] = TILT_METHOD_EXAMPLE
): TiltWorkedExample {
  const outletIds = example.flatMap(({ outletId, articles }) =>
    Array.from({ length: articles }, () => outletId)
  );
  const uncapped = emptyDistribution();
  for (const id of outletIds) uncapped[OUTLET_MAP[id]?.leaning ?? "unknown"]++;

  const dist = countLeaningDistribution(outletIds);
  const ratios = calcLeaningGroupRatios(dist);

  return {
    rows: example.map(({ outletId, articles }) => ({
      outlet: OUTLET_MAP[outletId],
      articles,
      counted: Math.min(articles, OUTLET_ARTICLE_CAP),
    })),
    totalArticles: outletIds.length,
    totalCounted: Object.values(dist).reduce((s, n) => s + n, 0),
    uncappedTilt: calcTilt(calcLeaningGroupRatios(uncapped)),
    tilt: calcTilt(ratios),
    ratios,
  };
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
