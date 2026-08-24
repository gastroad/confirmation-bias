import type { MetadataRoute } from "next";
import { findClusterRefs } from "@server/queries/clusters";
import { findDaySummaries } from "@server/queries/days";
import { SITE_URL, absoluteUrl } from "@/shared/config/site";

// 클러스터링이 하루 1회라 그에 맞춰 재생성 → 크롤러가 올 때마다 DB를 치지 않게 해 부하를 억제.
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [clusters, days] = await Promise.all([findClusterRefs(), findDaySummaries()]);

  // 날짜 페이지는 클러스터 상세보다 상위 허브다. 최신일수록 우선순위를 높게 준다.
  const dayEntries: MetadataRoute.Sitemap = days.map((d, i) => ({
    url: absoluteUrl(`/d/${d.bucketDate.toISOString().slice(0, 10)}`),
    lastModified: d.bucketDate,
    changeFrequency: i === 0 ? "hourly" : "monthly",
    priority: i === 0 ? 0.9 : 0.6,
  }));

  const clusterEntries: MetadataRoute.Sitemap = clusters.map((c) => ({
    url: absoluteUrl(`/clusters/${c.id}`),
    lastModified: c.updatedAt,
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
    ...dayEntries,
    ...clusterEntries,
  ];
}
