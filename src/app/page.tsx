import { getClusters } from "@/entities/cluster";
import { ClusterFeed } from "@/widgets/cluster-feed";

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
        <ClusterFeed clusters={clusters} />
      </main>
    </div>
  );
}
