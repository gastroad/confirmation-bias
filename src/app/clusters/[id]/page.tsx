import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findClusterDetailRow } from "@server/queries/clusters";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { toClusterDetail, isIndexableCluster, shouldRemoveCluster } from "@/entities/cluster";
import type { ClusterDetail } from "@/entities/cluster";
import { ClusterDetailView } from "@/widgets/cluster-detail";
import { ClusterComments } from "@/widgets/cluster-comments";
import { datePath } from "@/features/date-nav";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
import { JsonLd } from "@/shared/seo/JsonLd";
import { clusterCollectionSchema, clusterBreadcrumbSchema } from "@/shared/seo/schemas";
import { getUser } from "../../_session";
import { AppShell } from "../../_shell";

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
  ["cluster-detail", DTO_VERSION],
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
  if (!cluster || shouldRemoveCluster(cluster)) {
    return { title: "찾을 수 없는 이슈", robots: { index: false, follow: false } };
  }

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
    // 기사가 적거나 한 진영만 등장하는 클러스터는 "성향별 비교"가 성립하지 않는다.
    // 페이지는 그대로 열어 두고 색인만 뺀다. follow는 남겨 링크 그래프를 유지한다.
    // → entities/cluster의 INDEX_MIN_ARTICLES 주석
    ...(isIndexableCluster(cluster) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cluster, sessionUser] = await Promise.all([getCluster(id), getUser()]);

  if (!cluster) notFound();

  // 기준 미달 페이지는 **색인에서만 빼는 것으로 부족하다** — 사이트에 존재하는 것 자체가
  // "가치가 별로 없는 콘텐츠" 판정의 대상이고 크롤 예산을 먹는다. 댓글이 달린 것만 남긴다.
  //
  // ⚠️ 진짜 404가 나오려면 **이 라우트 위에 Suspense 경계가 없어야 한다.** 경계가 있으면
  // 응답이 200으로 먼저 스트리밍돼 soft 404(200 + noindex)가 된다. 그래서 루트
  // `loading.tsx`를 날짜 세그먼트로 내렸다 → app/d/[date]/loading.tsx
  if (shouldRemoveCluster(cluster)) notFound();

  return (
    // 홈은 최신 날짜만 보여주므로 과거 클러스터에서는 그날 목록으로 돌아가야 맥락이 이어진다.
    // 색인 대상인 클러스터에서만 광고를 띄운다 → shared/ui/AdSenseLoader
    <AppShell
      back={{
        href: datePath(cluster.bucketDate),
        label: formatBucketDateShort(cluster.bucketDate),
      }}
      // 여기 도달한 것은 색인 대상이거나 댓글이 달린 예외다. 광고는 색인 대상에만.
      ads={isIndexableCluster(cluster)}
    >
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

      <ClusterDetailView cluster={cluster} />
      <ClusterComments clusterId={cluster.id} signedIn={Boolean(sessionUser)} />
    </AppShell>
  );
}
