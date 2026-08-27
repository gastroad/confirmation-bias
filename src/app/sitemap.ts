import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { findIndexableClusterRefs } from "@server/queries/clusters";
import { findDaySummaries } from "@server/queries/days";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { INDEX_CRITERIA } from "@/entities/cluster";
import { SITE_URL, absoluteUrl } from "@/shared/config/site";

// 크롤러가 올 때마다 1만 건을 조회할 이유가 없다. Date를 넘기지 않도록 ISO 문자열로 뽑는다
// (unstable_cache는 반환값을 JSON 직렬화한다).
//
// **색인 기준을 넘긴 클러스터만 싣는다**(→ entities/cluster의 INDEX_MIN_ARTICLES 주석).
// 날짜 페이지도 같은 기준으로 거른다 — 껍데기만 모인 날짜를 상위 허브로 내보낼 이유가 없다.
const getEntries = unstable_cache(
  async () => {
    const [clusters, days] = await Promise.all([
      findIndexableClusterRefs(INDEX_CRITERIA),
      findDaySummaries(),
    ]);

    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    const indexableDays = new Set(clusters.map((c) => toIso(c.bucketDate)));

    return {
      days: days
        .filter((d) => indexableDays.has(toIso(d.bucketDate)))
        .map((d) => ({
          date: toIso(d.bucketDate),
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
    // 전량 색인하던 시절엔 0.5로 눌러 뒀지만, 이제 여기 남은 건 기준을 통과한 페이지뿐이다.
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      // 방법론 페이지는 이 서비스가 뭘 어떻게 계산하는지 밝히는 곳이라 약관보다 상위다.
      url: absoluteUrl("/about"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
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
