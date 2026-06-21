import { getClusters } from "@/entities/cluster";
import { ClusterFeed } from "@/widgets/cluster-feed";
import { ThemeToggle } from "@/features/theme-toggle";
import { OutletFilter, parseOutletParam } from "@/features/outlet-filter";
import * as layout from "@/shared/styles/layout.css";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ outlets?: string | string[] }>;
}) {
  const { outlets } = await searchParams;
  const outletsValue = Array.isArray(outlets) ? outlets.join(",") : outlets;
  const selectedOutlets = parseOutletParam(outletsValue);

  const clusters = await getClusters(selectedOutlets);

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <h1 className={layout.brand}>확증편향</h1>
          <p className={layout.brandSub}>언론사 성향별 뉴스 보도 분석</p>
          <div className={layout.headerActions}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        <OutletFilter />
        <ClusterFeed clusters={clusters} isFiltered={selectedOutlets.length > 0} />
      </main>
    </div>
  );
}
