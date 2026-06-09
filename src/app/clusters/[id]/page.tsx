import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OUTLET_MAP, emptyDistribution, calcLeaningGroupRatios, LEANING_ORDER, LEANING_COLORS, LEANING_LABELS } from "@/lib/outlets";
import { LeaningBar } from "@/components/LeaningBar";
import { GroupRatioBadges } from "@/components/GroupRatioBadges";
import { TimelineChart } from "@/components/TimelineChart";
import type { ClusterDetail, Leaning, TimelinePoint } from "@/types";

async function getClusterDetail(id: string): Promise<ClusterDetail | null> {
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
    const key = hour.toISOString();
    hourMap.set(key, (hourMap.get(key) ?? 0) + 1);
  }
  const timeline: TimelinePoint[] = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  const times = cluster.articles.map((a) => a.publishedAt.getTime());
  const latest = times.length > 0
    ? new Date(Math.max(...times)).toISOString()
    : cluster.createdAt.toISOString();

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

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cluster = await getClusterDetail(id);

  if (!cluster) notFound();

  const total = Object.values(cluster.leaningDistribution).reduce((s, n) => s + n, 0);

  // Group articles by outlet leaning order for display
  const articlesByLeaning = LEANING_ORDER.flatMap((leaning) =>
    cluster.articles.filter((a) => a.outlet.leaning === leaning)
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
            ← 목록
          </Link>
          <span className="text-zinc-200">|</span>
          <h1 className="text-sm font-bold text-zinc-900 truncate">확증편향</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {/* Cluster title & meta */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 leading-snug mb-2">
            {cluster.representativeTitle}
          </h2>
          {cluster.summary && (
            <p className="text-sm text-zinc-600 leading-relaxed">{cluster.summary}</p>
          )}
          <p className="text-xs text-zinc-400 mt-2">기사 {cluster.articleCount}건</p>
        </section>

        {/* Leaning distribution */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700">매체 성향 분포</h3>
          <LeaningBar distribution={cluster.leaningDistribution} showLabels />
          <GroupRatioBadges ratios={cluster.leaningGroupRatios} />

          <div className="grid grid-cols-3 gap-2 pt-1">
            {LEANING_ORDER.map((leaning) => {
              const count = cluster.leaningDistribution[leaning];
              if (count === 0) return null;
              return (
                <div key={leaning} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: LEANING_COLORS[leaning] }}
                    />
                    <span className="text-xs font-medium text-zinc-600">{LEANING_LABELS[leaning]}</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900">{count}</p>
                  <p className="text-xs text-zinc-400">{((count / total) * 100).toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700">시간대별 보도량</h3>
          <TimelineChart data={cluster.timeline} />
        </section>

        {/* Article list */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700">언론사별 기사 제목</h3>
          <ul className="space-y-2">
            {articlesByLeaning.map((a) => (
              <li key={a.id} className="flex gap-3 rounded-lg border border-zinc-100 p-3 hover:border-zinc-300 transition-colors">
                <div className="flex-shrink-0 pt-0.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full mt-1.5"
                    style={{ backgroundColor: LEANING_COLORS[a.outlet.leaning] }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-zinc-500">{a.outlet.name}</span>
                    <span className="text-xs text-zinc-300">{a.outlet.leaningLabel}</span>
                    <span className="text-xs text-zinc-300 ml-auto">{formatDate(a.publishedAt)}</span>
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-900 hover:text-indigo-600 transition-colors line-clamp-2"
                  >
                    {a.title}
                  </a>
                  {a.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{a.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
