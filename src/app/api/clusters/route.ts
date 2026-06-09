import { db } from "@/lib/db";
import { OUTLET_MAP, emptyDistribution, calcLeaningGroupRatios } from "@/lib/outlets";
import type { ClusterSummary, Leaning } from "@/types";

export async function GET() {
  const clusters = await db.cluster.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      articles: {
        select: {
          outletId: true,
          publishedAt: true,
        },
      },
    },
  });

  const summaries: ClusterSummary[] = clusters.map((c) => {
    const dist = emptyDistribution();

    for (const a of c.articles) {
      const outlet = OUTLET_MAP[a.outletId];
      const leaning: Leaning = outlet?.leaning ?? "unknown";
      dist[leaning]++;
    }

    const publishedDates = c.articles.map((a) => a.publishedAt.getTime());
    const latest = publishedDates.length > 0
      ? new Date(Math.max(...publishedDates)).toISOString()
      : c.createdAt.toISOString();

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

  return Response.json(summaries);
}
