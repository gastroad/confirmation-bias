import Link from "next/link";
import { notFound } from "next/navigation";
import { getClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cluster = await getClusterDetail(id);

  if (!cluster) notFound();

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

      <ClusterDetailView cluster={cluster} />
    </div>
  );
}
