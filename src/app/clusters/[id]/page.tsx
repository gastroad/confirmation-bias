import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findClusterDetailRow } from "@server/queries/clusters";
import { CACHE_TTL } from "@server/cache";
import { getSessionUser } from "@server/auth";
import { toClusterDetail } from "@/entities/cluster";
import type { ClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";
import { ClusterComments } from "@/widgets/cluster-comments";
import { ProfileMenu } from "@/features/profile-menu";
import { datePath } from "@/features/date-nav";
import { Logo } from "@/shared/ui";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
import { JsonLd } from "@/shared/seo/JsonLd";
import { clusterCollectionSchema, clusterBreadcrumbSchema } from "@/shared/seo/schemas";
import { signOutAction } from "../../auth/actions";
import * as layout from "@/shared/styles/layout.css";

// 두 겹으로 캐시한다.
//  - unstable_cache: 요청 **간** 캐시. 한번 만들어진 날짜의 클러스터는 굳으므로 길게 잡는다.
//    **DTO로 바꾼 뒤에 캐시한다** — Prisma row를 캐시하면 JSON 직렬화로 Date가 문자열이 되어
//    도메인 매핑이 깨진다.
//  - React cache: 요청 **안** 중복 제거. generateMetadata와 페이지 렌더가 같은 값을 쓴다.
const getClusterDetail = unstable_cache(
  async (id: string): Promise<ClusterDetail | null> => {
    const row = await findClusterDetailRow(id);
    return row ? toClusterDetail(row) : null;
  },
  ["cluster-detail"],
  { revalidate: CACHE_TTL.clusterDetail, tags: ["clusters"] }
);

const getCluster = cache(getClusterDetail);

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
  const cluster = await getCluster(id);
  if (!cluster) return { title: "찾을 수 없는 이슈", robots: { index: false, follow: false } };

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
  const [cluster, sessionUser] = await Promise.all([getCluster(id), getSessionUser()]);

  if (!cluster) notFound();

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
            <ProfileMenu user={sessionUser} signOut={signOutAction} />
          </div>
        </div>
      </header>

      <ClusterDetailView cluster={cluster} />

      <div className={layout.container}>
        <ClusterComments clusterId={cluster.id} signedIn={Boolean(sessionUser)} />
      </div>
    </div>
  );
}
