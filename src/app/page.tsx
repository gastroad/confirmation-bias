import { getClusters } from "@/entities/cluster";
import { ClusterFeed } from "@/widgets/cluster-feed";
import * as layout from "@/shared/styles/layout.css";

export default async function HomePage() {
  const clusters = await getClusters();

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <h1 className={layout.brand}>확증편향</h1>
          <p className={layout.brandSub}>언론사 성향별 뉴스 보도 분석</p>
        </div>
      </header>

      <main className={layout.container}>
        <ClusterFeed clusters={clusters} />
      </main>
    </div>
  );
}
