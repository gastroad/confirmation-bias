import Link from "next/link";
import { notFound } from "next/navigation";
import { findClusterDetailRow } from "@server/queries/clusters";
import { toClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";
import { ThemeToggle } from "@/features/theme-toggle";
import * as layout from "@/shared/styles/layout.css";

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await findClusterDetailRow(id);

  if (!row) notFound();

  const cluster = toClusterDetail(row);

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/" className={layout.backLink}>
            ← 목록
          </Link>
          <span className={layout.divider}>|</span>
          <h1 className={layout.brandSmall}>확증편향</h1>
          <div className={layout.headerActions}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <ClusterDetailView cluster={cluster} />
    </div>
  );
}
