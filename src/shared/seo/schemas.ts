import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_DESCRIPTION,
  absoluteUrl,
} from "@/shared/config/site";

// schema.org 구조화 데이터 빌더. 반환값은 JsonLd 컴포넌트로 렌더한다.

export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ko-KR",
  };
}

interface ClusterForSchema {
  id: string;
  representativeTitle: string;
  description: string;
  articleCount: number;
  latestPublishedAt: string;
  articles: { title: string; url: string }[];
}

/** 이슈 클러스터 상세: 여러 출처를 묶은 집계 페이지이므로 CollectionPage + ItemList. */
export function clusterCollectionSchema(cluster: ClusterForSchema): Record<string, unknown> {
  const url = absoluteUrl(`/clusters/${cluster.id}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cluster.representativeTitle,
    headline: cluster.representativeTitle,
    description: cluster.description,
    url,
    inLanguage: "ko-KR",
    dateModified: cluster.latestPublishedAt,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cluster.articleCount,
      itemListElement: cluster.articles.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: a.url,
        name: a.title,
      })),
    },
  };
}

export function clusterBreadcrumbSchema(cluster: {
  id: string;
  representativeTitle: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: cluster.representativeTitle,
        item: absoluteUrl(`/clusters/${cluster.id}`),
      },
    ],
  };
}
