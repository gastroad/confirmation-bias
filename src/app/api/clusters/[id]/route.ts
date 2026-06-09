import { db } from "@/lib/db";
import { OUTLET_MAP, emptyDistribution, calcLeaningGroupRatios } from "@/lib/outlets";
import type { ClusterDetail, Leaning, TimelinePoint } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cluster = await db.cluster.findUnique({
    where: { id },
    include: {
      articles: {
        orderBy: { publishedAt: "asc" },
        include: { outlet: true },
      },
    },
  });

  if (!cluster) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

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

  // Build hourly timeline
  const hourMap = new Map<string, number>();
  for (const a of cluster.articles) {
    const hour = new Date(a.publishedAt);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    hourMap.set(key, (hourMap.get(key) ?? 0) + 1);
  }
  const timeline: TimelinePoint[] = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  const publishedDates = cluster.articles.map((a) => a.publishedAt.getTime());
  const latest = publishedDates.length > 0
    ? new Date(Math.max(...publishedDates)).toISOString()
    : cluster.createdAt.toISOString();

  const detail: ClusterDetail = {
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

  return Response.json(detail);
}
