import type { MetadataRoute } from "next";
import { findClusterRefs } from "@server/queries/clusters";
import { SITE_URL, absoluteUrl } from "@/shared/config/site";

// ingest 주기(6시간)에 맞춰 재생성 → 크롤러가 올 때마다 DB를 치지 않게 해 egress를 억제.
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clusters = await findClusterRefs();

  const clusterEntries: MetadataRoute.Sitemap = clusters.map((c) => ({
    url: absoluteUrl(`/clusters/${c.id}`),
    lastModified: c.updatedAt,
    changeFrequency: "hourly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...clusterEntries,
  ];
}
