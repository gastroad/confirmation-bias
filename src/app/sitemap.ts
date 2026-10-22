import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { findIndexableClusterRefs } from "@server/queries/clusters";
import { findDaySummaries } from "@server/queries/days";
import { findOutletStats } from "@server/queries/outlets";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { INDEX_CRITERIA } from "@/entities/cluster";
import { SITE_URL, absoluteUrl } from "@/shared/config/site";

/**
 * ⚠️ **이 라우트를 정적으로 두면 안 된다.**
 *
 * `sitemap.ts`는 Next의 특수 Route Handler이고 **기본이 캐시(정적 프리렌더)** 다 —
 * dynamic config를 쓰지 않으면 빌드 시점 결과가 그대로 굳는다. 2026-09-07 배포의 빌드
 * 결과가 **45일간 그대로 서빙됐다**(클러스터 2,463 · 날짜 71 — 실제 DB는 4,417 · 116).
 *
 * 매일 기사를 쌓는 사이트가 sitemap을 45일 동안 바꾸지 않은 셈이고, 그 사이 신규 색인 대상
 * 1,954개와 날짜 45개가 **Google에 제출조차 되지 않았다.** AdSense 2차 거절 사유의
 * "지속적인 콘텐츠 큐레이션 및 구조적 유지관리"에 정면으로 걸린다.
 *
 * 홈 엔트리의 `lastModified`가 `new Date()`라 **렌더 시각이 그대로 박힌다** — 라이브
 * sitemap이 언제 만들어진 것인지 그 값으로 확인할 수 있다(진단 방법은 caching.md).
 *
 * 시간 기반 `revalidate`에 기대지 않는 이유: 파이프라인이 GitHub Actions에서 **DB에 직접
 * 쓰므로** 배포된 앱은 데이터가 바뀐 것을 통보받지 못한다(`revalidateTag` 호출부가 없다 →
 * caching.md). 그래서 **라우트는 매 요청 돌리고**, DB 비용은 아래 `unstable_cache`(6h)가
 * 막는다 — 크롤러가 몰려도 조회는 6시간에 한 번이다.
 * → docs/agent/adsense-compliance.md의 P0-7
 */
export const dynamic = "force-dynamic";

// Date를 넘기지 않도록 ISO 문자열로 뽑는다 (unstable_cache는 반환값을 JSON 직렬화한다).
//
// **색인 기준을 넘긴 클러스터만 싣는다**(→ entities/cluster의 INDEX_MIN_ARTICLES 주석).
// 날짜 페이지도 같은 기준으로 거른다 — 껍데기만 모인 날짜를 상위 허브로 내보낼 이유가 없다.
const getEntries = unstable_cache(
  async () => {
    const [clusters, days, outlets] = await Promise.all([
      findIndexableClusterRefs(INDEX_CRITERIA),
      findDaySummaries(),
      findOutletStats(),
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
      // 기사가 한 건도 없는 매체는 보여줄 집계가 없다(상세 페이지도 noindex다).
      outlets: outlets.filter((o) => o.articleCount > 0).map((o) => o.outletId),
    };
  },
  ["sitemap-entries", DTO_VERSION],
  { revalidate: CACHE_TTL.sitemap, tags: ["clusters", "days"] }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { days, clusters, outlets } = await getEntries();

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

  // 언론사 페이지는 전부 우리가 계산한 값이라 복제 텍스트가 0이다. 날짜 허브 다음으로 둔다.
  const outletEntries: MetadataRoute.Sitemap = outlets.map((id) => ({
    url: absoluteUrl(`/outlets/${id}`),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
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
    {
      // 선별 게재(curation) 페이지. 매일 내용이 바뀌고 URL은 고정이다.
      url: absoluteUrl("/weekly"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/outlets"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...outletEntries,
    ...dayEntries,
    ...clusterEntries,
  ];
}
