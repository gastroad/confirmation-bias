import { unstable_cache } from "next/cache";
import { findClusterSummaryPage, findClusterStats } from "@server/queries/clusters";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import {
  toClusterSummary,
  toClusterStats,
  INDEX_CRITERIA,
  STATS_OUTLET_ARTICLE_CAP,
} from "@/entities/cluster";
import type { ClustersPage, ClusterStats } from "@/entities/cluster";

/**
 * 목록·집계의 DTO 경계. **API 라우트와 첫 화면 SSR이 이 하나를 같이 쓴다.**
 *
 * 페이지가 첫 페이지를 서버에서 그리고 무한 스크롤은 클라이언트가 이어받는데(→ `_feed-seed.ts`),
 * 캐시가 라우트 파일 안에 있으면 두 경로가 각자 캐시 항목을 만들어 같은 값을 DB에서 두 번
 * 읽는다. 키(`clusters-page`·`clusters-stats`)는 라우트에 있던 것을 그대로 옮겼다.
 *
 * **DTO로 바꾼 뒤에 캐시한다** — `unstable_cache`는 반환값을 JSON 직렬화하므로 Prisma row를
 * 그대로 캐시하면 `Date`가 문자열로 돌아와 도메인 매핑이 깨진다. → docs/agent/caching.md
 */
export const getClustersPage = unstable_cache(
  async (
    cursor: string | undefined,
    limit: number | undefined,
    outletIds: string[],
    bucketDateIso: string | undefined
  ): Promise<ClustersPage> => {
    const { rows, nextCursor } = await findClusterSummaryPage({
      cursor,
      limit,
      outletIds,
      bucketDate: bucketDateIso ? new Date(bucketDateIso) : undefined,
    });
    return { items: rows.map(toClusterSummary), nextCursor };
  },
  ["clusters-page", DTO_VERSION],
  { revalidate: CACHE_TTL.clusterList, tags: ["clusters"] }
);

export const getClusterStats = unstable_cache(
  async (outletIds: string[], bucketDateIso: string | undefined): Promise<ClusterStats> =>
    toClusterStats(
      await findClusterStats(
        outletIds,
        bucketDateIso ? new Date(bucketDateIso) : undefined,
        INDEX_CRITERIA,
        STATS_OUTLET_ARTICLE_CAP
      )
    ),
  ["clusters-stats", DTO_VERSION],
  { revalidate: CACHE_TTL.clusterList, tags: ["clusters"] }
);
