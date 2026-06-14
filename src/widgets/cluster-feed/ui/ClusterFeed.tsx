import Link from "next/link";
import { LeaningBar, GroupRatioBadges, emptyDistribution, LEANING_LABELS } from "@/entities/outlet";
import type { Leaning } from "@/entities/outlet";
import type { ClusterSummary } from "@/entities/cluster";
import { formatRelative } from "@/shared/lib/format";

interface Props {
  clusters: ClusterSummary[];
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

export function ClusterFeed({ clusters }: Props) {
  if (clusters.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 p-10 text-center">
        <p className="text-zinc-500 text-sm">데이터가 없습니다.</p>
        <p className="text-zinc-400 text-xs mt-1">
          <code className="bg-zinc-100 px-1 rounded">npm run ingest</code> 로 기사를 수집해주세요.
        </p>
      </div>
    );
  }

  return (
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
  );
}
