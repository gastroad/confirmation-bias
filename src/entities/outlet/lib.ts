import { OUTLET_MAP, OUTLETS } from "./model";
import type {
  OutletStats,
  OutletOverlap,
  OutletDailyPoint,
  OutletClusterRef,
  OutletProfile,
} from "./model";

// 서버 쿼리(server/queries/outlets.ts) 결과를 받는 입력 형태.
interface StatsRow {
  outletId: string;
  articleCount: number;
  clusterCount: number;
  soloCount: number;
  firstMoverCount: number;
  firstDate: Date | null;
  lastDate: Date | null;
}

// @db.Date 컬럼은 UTC 자정 Date로 오므로 날짜 부분만 떼면 그대로 KST 기준일이 된다.
const toDateString = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function toOutletStats(row: StatsRow): OutletStats {
  return {
    outletId: row.outletId,
    articleCount: row.articleCount,
    clusterCount: row.clusterCount,
    soloCount: row.soloCount,
    firstMoverCount: row.firstMoverCount,
    firstDate: toDateString(row.firstDate),
    lastDate: toDateString(row.lastDate),
  };
}

export function toOutletProfile(input: {
  stats: StatsRow;
  overlaps: { outletId: string; sharedClusters: number }[];
  daily: { bucketDate: Date; count: number }[];
  recentClusters: {
    id: string;
    representativeTitle: string;
    bucketDate: Date;
    articleCount: number;
  }[];
}): OutletProfile | null {
  const outlet = OUTLET_MAP[input.stats.outletId];
  if (!outlet) return null;

  const overlaps: OutletOverlap[] = input.overlaps.filter((o) => Boolean(OUTLET_MAP[o.outletId]));
  const daily: OutletDailyPoint[] = input.daily.map((d) => ({
    date: d.bucketDate.toISOString().slice(0, 10),
    count: d.count,
  }));
  const recentClusters: OutletClusterRef[] = input.recentClusters.map((c) => ({
    id: c.id,
    title: c.representativeTitle,
    bucketDate: c.bucketDate.toISOString().slice(0, 10),
    articleCount: c.articleCount,
  }));

  return { outlet, stats: toOutletStats(input.stats), overlaps, daily, recentClusters };
}

/** 소수 첫째 자리까지. 0으로 나누지 않는다. */
export function ratioPercent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;
}

function koreanDate(value: string): string {
  const d = new Date(`${value}T00:00:00Z`);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

/**
 * 언론사 페이지의 자체 작성 문장. 클러스터 요약(`server/clustering/summary.ts`)과 같은 취지다 —
 * 원문 어디에도 없고 우리 집계로만 나오는 정보를 문장으로 옮긴다.
 *
 * **언론사 이름 뒤에 조사를 붙이지 않는다.** 받침에 따라 "은/는"이 갈리고 SBS 같은 알파벳
 * 이름까지 얹히면 규칙이 늘어난다. 이름을 주어로 세우지 않는 문형을 쓴다.
 */
export function buildOutletSummary(profile: OutletProfile): string {
  const { stats, overlaps } = profile;

  if (stats.articleCount === 0 || !stats.firstDate || !stats.lastDate) {
    return "현재 수집된 기사가 없습니다. RSS 피드가 갱신되지 않고 있거나 수집 대상에서 빠져 있습니다.";
  }

  const sentences: string[] = [
    `${koreanDate(stats.firstDate)}부터 ${koreanDate(stats.lastDate)}까지 기사 ${stats.articleCount.toLocaleString()}건을 수집했고, ${stats.clusterCount.toLocaleString()}개 이슈에 등장했습니다.`,
  ];

  if (stats.clusterCount > 0) {
    const solo = ratioPercent(stats.soloCount, stats.clusterCount);
    sentences.push(
      `그중 ${stats.soloCount.toLocaleString()}개(${solo}%)는 다른 매체에서 확인되지 않은 단독 보도이고, ${stats.firstMoverCount.toLocaleString()}개 이슈에서는 가장 먼저 보도했습니다.`
    );
  }

  if (overlaps.length > 0) {
    const names = overlaps
      .slice(0, 3)
      .map((o) => `${OUTLET_MAP[o.outletId]?.name}(${o.sharedClusters.toLocaleString()}건)`)
      .join("·");
    sentences.push(`같은 이슈를 가장 자주 함께 다룬 곳은 ${names}입니다.`);
  }

  return sentences.join(" ");
}

/** 목록 페이지용. 기사 수가 많은 순, 없는 매체는 뒤로. */
export function sortOutletsByVolume(stats: OutletStats[]): OutletStats[] {
  const order = new Map(OUTLETS.map((o, i) => [o.id, i]));
  return [...stats].sort(
    (a, b) =>
      b.articleCount - a.articleCount || (order.get(a.outletId) ?? 0) - (order.get(b.outletId) ?? 0)
  );
}
