import { db } from "@server/db";
import { OUTLET_MAP, emptyDistribution, calcLeaningGroupRatios } from "@/entities/outlet";
import type { Leaning } from "@/entities/outlet";
import type { TimelinePoint } from "@/entities/article";
import type { ClusterSummary, ClusterDetail } from "./model";

export async function getClusters(outletIds?: string[]): Promise<ClusterSummary[]> {
  // 선택 언론사가 보도한 클러스터만 남긴다. 성향 분포는 전체 기사 기준으로 계산하므로
  // where로 클러스터만 거르고 articles include 범위는 그대로 둔다.
  const hasFilter = outletIds !== undefined && outletIds.length > 0;

  const clusters = await db.cluster.findMany({
    where: hasFilter ? { articles: { some: { outletId: { in: outletIds } } } } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      articles: {
        select: { outletId: true, publishedAt: true },
      },
    },
  });

  return clusters.map((c) => {
    const dist = emptyDistribution();
    for (const a of c.articles) {
      const leaning: Leaning = OUTLET_MAP[a.outletId]?.leaning ?? "unknown";
      dist[leaning]++;
    }
    const times = c.articles.map((a) => a.publishedAt.getTime());
    const latest =
      times.length > 0 ? new Date(Math.max(...times)).toISOString() : c.createdAt.toISOString();

    return {
      id: c.id,
      representativeTitle: c.representativeTitle,
      summary: c.summary,
      articleCount: c.articles.length,
      latestPublishedAt: latest,
      leaningDistribution: dist,
      leaningGroupRatios: calcLeaningGroupRatios(dist),
    };
  });
}

export async function getClusterDetail(id: string): Promise<ClusterDetail | null> {
  const cluster = await db.cluster.findUnique({
    where: { id },
    include: {
      articles: {
        orderBy: { publishedAt: "asc" },
        include: { outlet: true },
      },
    },
  });

  if (!cluster) return null;

  const dist = emptyDistribution();

  const articles = cluster.articles.map((a) => {
    const meta = OUTLET_MAP[a.outletId];
    const leaning: Leaning = meta?.leaning ?? "unknown";
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
  for (const a of cluster.articles) {
    const hour = new Date(a.publishedAt);
    hour.setMinutes(0, 0, 0);
    hourMap.set(hour.toISOString(), (hourMap.get(hour.toISOString()) ?? 0) + 1);
  }
  const timeline: TimelinePoint[] = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  const times = cluster.articles.map((a) => a.publishedAt.getTime());
  const latest =
    times.length > 0 ? new Date(Math.max(...times)).toISOString() : cluster.createdAt.toISOString();

  return {
    id: cluster.id,
    representativeTitle: cluster.representativeTitle,
    summary: cluster.summary,
    articleCount: cluster.articles.length,
    latestPublishedAt: latest,
    leaningDistribution: dist,
    leaningGroupRatios: calcLeaningGroupRatios(dist),
    articles,
    timeline,
  };
}
