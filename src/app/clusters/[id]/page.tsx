import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findClusterDetailRow } from "@server/queries/clusters";
import { toClusterDetail } from "@/entities/cluster";
import type { ClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";
import { ThemeToggle } from "@/features/theme-toggle";
import { datePath } from "@/features/date-nav";
import { Logo } from "@/shared/ui";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
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
          {/* 홈은 최신 날짜만 보여주므로 과거 클러스터에서는 그날 목록으로 돌아가야 맥락이 이어진다. */}
          <Link href={datePath(cluster.bucketDate)} className={layout.backLink}>
            ← {formatBucketDateShort(cluster.bucketDate)}
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
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
