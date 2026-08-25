import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { findClusterRefs } from "@server/queries/clusters";
import { findDaySummaries } from "@server/queries/days";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { SITE_URL, absoluteUrl } from "@/shared/config/site";

// 크롤러가 올 때마다 1만 건을 조회할 이유가 없다. Date를 넘기지 않도록 ISO 문자열로 뽑는다
// (unstable_cache는 반환값을 JSON 직렬화한다).
const getEntries = unstable_cache(
  async () => {
    const [clusters, days] = await Promise.all([findClusterRefs(), findDaySummaries()]);
    return {
      days: days.map((d) => ({
        date: d.bucketDate.toISOString().slice(0, 10),
        lastModified: d.bucketDate.toISOString(),
      })),
      clusters: clusters.map((c) => ({
        id: c.id,
        lastModified: c.updatedAt.toISOString(),
      })),
    };
  },
  ["sitemap-entries", DTO_VERSION],
  { revalidate: CACHE_TTL.sitemap, tags: ["clusters", "days"] }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { days, clusters } = await getEntries();

  // 날짜 페이지는 클러스터 상세보다 상위 허브다. 최신일수록 우선순위를 높게 준다.
  const dayEntries: MetadataRoute.Sitemap = days.map((d, i) => ({
    url: absoluteUrl(`/d/${d.date}`),
    lastModified: new Date(d.lastModified),
    changeFrequency: i === 0 ? "hourly" : "monthly",
    priority: i === 0 ? 0.9 : 0.6,
  }));

  const clusterEntries: MetadataRoute.Sitemap = clusters.map((c) => ({
    url: absoluteUrl(`/clusters/${c.id}`),
    lastModified: new Date(c.lastModified),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...dayEntries,
    ...clusterEntries,
  ];
}
