import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findClusterDetailRow } from "@server/queries/clusters";
import { toClusterDetail } from "@/entities/cluster";
import type { ClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";
import { ThemeToggle } from "@/features/theme-toggle";
import { JsonLd } from "@/shared/seo/JsonLd";
import { clusterCollectionSchema, clusterBreadcrumbSchema } from "@/shared/seo/schemas";
import * as layout from "@/shared/styles/layout.css";

// generateMetadata와 페이지 렌더가 같은 행을 쓰므로 cache로 요청당 1회만 DB 조회한다(egress 절약).
const getCluster = cache(findClusterDetailRow);

function metaDescription(cluster: ClusterDetail): string {
  if (cluster.summary) return cluster.summary;
  return `${cluster.articleCount}개 언론사가 보도한 이슈. 진보·중도·보수 매체가 이 사건을 어떻게 다르게 전했는지 성향 분포로 비교합니다.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getCluster(id);
  if (!row) return { title: "찾을 수 없는 이슈", robots: { index: false, follow: false } };

  const cluster = toClusterDetail(row);
  const title = cluster.representativeTitle;
  const description = metaDescription(cluster);
  const path = `/clusters/${id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      modifiedTime: cluster.latestPublishedAt,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getCluster(id);

  if (!row) notFound();

  const cluster = toClusterDetail(row);

  return (
    <div className={layout.page}>
      <JsonLd
        data={clusterCollectionSchema({
          id: cluster.id,
          representativeTitle: cluster.representativeTitle,
          description: metaDescription(cluster),
          articleCount: cluster.articleCount,
          latestPublishedAt: cluster.latestPublishedAt,
          articles: cluster.articles.map((a) => ({ title: a.title, url: a.url })),
        })}
      />
      <JsonLd
        data={clusterBreadcrumbSchema({
          id: cluster.id,
          representativeTitle: cluster.representativeTitle,
        })}
      />

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
