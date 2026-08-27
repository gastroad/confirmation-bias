import {
  TILT_BALANCE_THRESHOLD,
  OUTLET_MAP,
  emptyDistribution,
  calcLeaningGroupRatios,
  calcTilt,
  LEANING_ORDER,
  LEANING_GROUPS,
  LEANING_GROUP_ORDER,
  GROUP_BY_LEANING,
} from "@/entities/outlet";
import type { Leaning, LeaningDistribution } from "@/entities/outlet";
import type { TimelinePoint } from "@/entities/article";
import type { ClusterSummary, ClusterDetail, ClusterStats, DaySummary } from "./model";
import { INDEX_MIN_ARTICLES, INDEX_MIN_LEANING_GROUPS } from "./model";

// 서버 쿼리(server/queries/clusters.ts) 결과를 받는 입력 형태.
// Prisma 결과가 구조적으로 호환되며, 여기(도메인 레이어)에서 DTO로 변환한다.
interface SummaryRow {
  id: string;
  representativeTitle: string;
  summary: string | null;
  bucketDate: Date;
  createdAt: Date;
  articles: { outletId: string; publishedAt: Date }[];
}

interface DetailRow extends SummaryRow {
  articles: {
    id: string;
    title: string;
    url: string;
    publishedAt: Date;
    outletId: string;
    outlet: { name: string; domain: string; leaning: string };
  }[];
}

function leaningOf(outletId: string): Leaning {
  return OUTLET_MAP[outletId]?.leaning ?? "unknown";
}

function latestIso(times: number[], fallback: Date): string {
  return times.length > 0 ? new Date(Math.max(...times)).toISOString() : fallback.toISOString();
}

// @db.Date 컬럼은 UTC 자정 Date로 오므로 날짜 부분만 떼면 그대로 KST 기준일이 된다.
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function toClusterSummary(row: SummaryRow): ClusterSummary {
  const dist = emptyDistribution();
  for (const a of row.articles) {
    dist[leaningOf(a.outletId)]++;
  }

  const ratios = calcLeaningGroupRatios(dist);

  return {
    id: row.id,
    representativeTitle: row.representativeTitle,
    summary: row.summary,
    bucketDate: toDateString(row.bucketDate),
    articleCount: row.articles.length,
    outletCount: new Set(row.articles.map((a) => a.outletId)).size,
    latestPublishedAt: latestIso(
      row.articles.map((a) => a.publishedAt.getTime()),
      row.createdAt
    ),
    leaningDistribution: dist,
    leaningGroupRatios: ratios,
    tilt: calcTilt(ratios),
  };
}

export function toClusterDetail(row: DetailRow): ClusterDetail {
  const dist = emptyDistribution();

  const articles = row.articles.map((a) => {
    const meta = OUTLET_MAP[a.outletId];
    const leaning = leaningOf(a.outletId);
    dist[leaning]++;

    return {
      id: a.id,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt.toISOString(),
      outlet: meta ?? {
        id: a.outletId,
        name: a.outlet.name,
        domain: a.outlet.domain,
        leaning: a.outlet.leaning as Leaning,
        leaningLabel: a.outlet.leaning,
      },
    };
  });

  const hourMap = new Map<string, number>();
  for (const a of row.articles) {
    const hour = new Date(a.publishedAt);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    hourMap.set(key, (hourMap.get(key) ?? 0) + 1);
  }
  const timeline: TimelinePoint[] = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  const ratios = calcLeaningGroupRatios(dist);

  return {
    id: row.id,
    representativeTitle: row.representativeTitle,
    summary: row.summary,
    bucketDate: toDateString(row.bucketDate),
    articleCount: row.articles.length,
    outletCount: new Set(row.articles.map((a) => a.outletId)).size,
    latestPublishedAt: latestIso(
      row.articles.map((a) => a.publishedAt.getTime()),
      row.createdAt
    ),
    leaningDistribution: dist,
    leaningGroupRatios: ratios,
    tilt: calcTilt(ratios),
    articles,
    timeline,
  };
}

export function toDaySummary(row: {
  bucketDate: Date;
  clusterCount: number;
  articleCount: number;
}): DaySummary {
  return {
    date: toDateString(row.bucketDate),
    clusterCount: row.clusterCount,
    articleCount: row.articleCount,
  };
}

export function toClusterStats(raw: {
  clusterCount: number;
  articleCount: number;
  outletCounts: { outletId: string; count: number }[];
}): ClusterStats {
  const dist = emptyDistribution();
  for (const { outletId, count } of raw.outletCounts) {
    dist[leaningOf(outletId)] += count;
  }

  const dominantLeaning =
    LEANING_ORDER.filter((l) => l !== "unknown").sort((a, b) => dist[b] - dist[a])[0] ?? null;

  return {
    clusterCount: raw.clusterCount,
    articleCount: raw.articleCount,
    leaningDistribution: dist,
    dominantLeaning: dist[dominantLeaning ?? "unknown"] > 0 ? dominantLeaning : null,
  };
}

/**
 * 등장한 진영 그룹(진보/중도/보수)의 수. `unknown`은 어느 그룹에도 속하지 않아 세지 않는다.
 */
export function countLeaningGroups(dist: LeaningDistribution): number {
  return LEANING_GROUP_ORDER.filter((g) => LEANING_GROUPS[g].some((l) => dist[l] > 0)).length;
}

/**
 * 이 클러스터가 색인 대상인가. 기준의 근거는 `INDEX_MIN_ARTICLES` 주석에 있다.
 *
 * DTO만 보고 판정하므로 상세 페이지는 **DB를 다시 치지 않는다.** sitemap은 1만 건을 전부
 * DTO로 만들 수 없어 같은 기준을 SQL로 표현한다(`findIndexableClusterRefs`) — 임계값은
 * 거기에도 이 상수를 넘겨 단일 출처를 유지한다.
 */
export function isIndexableCluster(
  cluster: Pick<ClusterSummary, "articleCount" | "leaningDistribution">
): boolean {
  return (
    cluster.articleCount >= INDEX_MIN_ARTICLES &&
    countLeaningGroups(cluster.leaningDistribution) >= INDEX_MIN_LEANING_GROUPS
  );
}

/**
 * `server/queries/clusters.ts`의 raw SQL에 그대로 넘기는 색인 기준.
 * `server/`는 이 상수들을 import할 수 없으므로 값이 여기서 흘러 들어간다.
 */
export const INDEX_CRITERIA = {
  minArticles: INDEX_MIN_ARTICLES,
  minLeaningGroups: INDEX_MIN_LEANING_GROUPS,
  groupByLeaning: GROUP_BY_LEANING,
} as const;

/**
 * 목록에서 **한 매체만 다룬 이슈**를 갈라낸다.
 *
 * 실측으로 클러스터의 61%가 단독 보도다. 그대로 섞어 놓으면 스크롤할수록 비교가 성립하지
 * 않는 카드만 나온다. **감추는 게 아니라 분류하는 것이다** — 호출한 쪽이 건수를 밝히고
 * 접어서 보여준다. → docs/agent/adsense-compliance.md
 */
export function partitionBySpread(clusters: ClusterSummary[]): {
  covered: ClusterSummary[];
  solo: ClusterSummary[];
} {
  const covered: ClusterSummary[] = [];
  const solo: ClusterSummary[] = [];
  for (const c of clusters) (c.outletCount >= 2 ? covered : solo).push(c);
  return { covered, solo };
}

/**
 * 진영 간 보도량이 가장 크게 갈린 이슈. 주간 리포트의 선별 규칙이다.
 *
 * `minArticles`를 색인 기준보다 높게 잡는 이유: 3~4건짜리는 한 건만 갈려도 ±75%p가 나와
 * 목록이 그런 것들로만 채워진다. 수치가 과장될 뿐 아니라 "여러 매체가 다뤘는데도 한쪽이
 * 압도했다"는 이 목록의 주장 자체가 성립하지 않는다.
 */
export function selectMostSplit(
  clusters: readonly ClusterSummary[],
  { minArticles, limit }: { minArticles: number; limit: number }
): ClusterSummary[] {
  return clusters
    .filter((c) => c.articleCount >= minArticles && Math.abs(c.tilt) >= TILT_BALANCE_THRESHOLD)
    .slice()
    .sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt) || b.articleCount - a.articleCount)
    .slice(0, limit);
}

/** 진보·중도·보수가 모두 다룬 이슈를 보도량 순으로. 성향과 무관하게 무게가 실린 사건. */
export function selectMostShared(
  clusters: readonly ClusterSummary[],
  limit: number
): ClusterSummary[] {
  return clusters
    .filter((c) => countLeaningGroups(c.leaningDistribution) === LEANING_GROUP_ORDER.length)
    .slice()
    .sort((a, b) => b.articleCount - a.articleCount || Math.abs(a.tilt) - Math.abs(b.tilt))
    .slice(0, limit);
}
