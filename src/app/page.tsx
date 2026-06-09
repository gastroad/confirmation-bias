import Link from "next/link";
import { db } from "@/lib/db";
import { OUTLET_MAP, emptyDistribution, calcLeaningGroupRatios, LEANING_LABELS } from "@/lib/outlets";
import { LeaningBar } from "@/components/LeaningBar";
import { GroupRatioBadges } from "@/components/GroupRatioBadges";
import type { ClusterSummary, Leaning } from "@/types";

async function getClusters(): Promise<ClusterSummary[]> {
  const clusters = await db.cluster.findMany({
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
    const latest = times.length > 0
      ? new Date(Math.max(...times)).toISOString()
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
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function StatsBar({ clusters }: { clusters: ClusterSummary[] }) {
  const totalArticles = clusters.reduce((s, c) => s + c.articleCount, 0);

  const totalDist = emptyDistribution();
  for (const c of clusters) {
    for (const [k, v] of Object.entries(c.leaningDistribution) as [Leaning, number][]) {
      totalDist[k] += v;
    }
  }

  const dominantLeaning = (Object.entries(totalDist) as [Leaning, number][])
    .filter(([k]) => k !== "unknown")
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  return (
    <div className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-zinc-900">{clusters.length}</p>
        <p className="text-xs text-zinc-500 mt-0.5">이슈 클러스터</p>
      </div>
      <div className="text-center border-x border-zinc-200">
        <p className="text-2xl font-bold text-zinc-900">{totalArticles}</p>
        <p className="text-xs text-zinc-500 mt-0.5">수집 기사</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-zinc-900">
          {dominantLeaning ? LEANING_LABELS[dominantLeaning] : "—"}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">최다 보도 성향</p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const clusters = await getClusters();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900">확증편향</h1>
          <p className="text-sm text-zinc-400">언론사 성향별 뉴스 보도 분석</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {clusters.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 p-10 text-center">
            <p className="text-zinc-500 text-sm">데이터가 없습니다.</p>
            <p className="text-zinc-400 text-xs mt-1">
              <code className="bg-zinc-100 px-1 rounded">npm run db:seed</code> 로 시드 데이터를 삽입해주세요.
            </p>
          </div>
        ) : (
          <>
            <StatsBar clusters={clusters} />

            <section>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                이슈 목록 ({clusters.length})
              </h2>
              <ul className="space-y-3">
                {clusters.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/clusters/${c.id}`}
                      className="block rounded-xl border border-zinc-200 p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-medium text-zinc-900 leading-snug">
                          {c.representativeTitle}
                        </h3>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {formatRelative(c.latestPublishedAt)}
                        </span>
                      </div>

                      <LeaningBar distribution={c.leaningDistribution} />

                      <div className="mt-2 flex items-center justify-between">
                        <GroupRatioBadges ratios={c.leaningGroupRatios} />
                        <span className="text-xs text-zinc-400">{c.articleCount}건</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
