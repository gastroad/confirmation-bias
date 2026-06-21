import Link from "next/link";
import { notFound } from "next/navigation";
import { getClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";
import * as layout from "@/shared/styles/layout.css";

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cluster = await getClusterDetail(id);

  if (!cluster) notFound();

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/" className={layout.backLink}>
            ← 목록
          </Link>
          <span className={layout.divider}>|</span>
          <h1 className={layout.brandSmall}>확증편향</h1>
        </div>
      </header>

      <ClusterDetailView cluster={cluster} />
    </div>
  );
}
