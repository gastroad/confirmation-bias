import {
  OUTLET_MAP,
  emptyDistribution,
  calcLeaningGroupRatios,
  LEANING_ORDER,
} from "@/entities/outlet";
import type { Leaning } from "@/entities/outlet";
import type { TimelinePoint } from "@/entities/article";
import type { ClusterSummary, ClusterDetail, ClusterStats } from "./model";

// 서버 쿼리(server/queries/clusters.ts) 결과를 받는 입력 형태.
// Prisma 결과가 구조적으로 호환되며, 여기(도메인 레이어)에서 DTO로 변환한다.
interface SummaryRow {
  id: string;
  representativeTitle: string;
  summary: string | null;
  createdAt: Date;
  articles: { outletId: string; publishedAt: Date }[];
}

interface DetailRow extends SummaryRow {
  articles: {
    id: string;
    title: string;
    description: string | null;
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

export function toClusterSummary(row: SummaryRow): ClusterSummary {
  const dist = emptyDistribution();
  for (const a of row.articles) {
    dist[leaningOf(a.outletId)]++;
  }

  return {
    id: row.id,
    representativeTitle: row.representativeTitle,
    summary: row.summary,
    articleCount: row.articles.length,
    latestPublishedAt: latestIso(
      row.articles.map((a) => a.publishedAt.getTime()),
      row.createdAt
    ),
    leaningDistribution: dist,
    leaningGroupRatios: calcLeaningGroupRatios(dist),
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
      description: a.description,
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

  return {
    id: row.id,
    representativeTitle: row.representativeTitle,
    summary: row.summary,
    articleCount: row.articles.length,
    latestPublishedAt: latestIso(
      row.articles.map((a) => a.publishedAt.getTime()),
      row.createdAt
    ),
    leaningDistribution: dist,
    leaningGroupRatios: calcLeaningGroupRatios(dist),
    articles,
    timeline,
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
