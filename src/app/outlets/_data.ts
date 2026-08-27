import { unstable_cache } from "next/cache";
import {
  findOutletStats,
  findOutletOverlap,
  findOutletDailyCounts,
  findOutletRecentClusters,
} from "@server/queries/outlets";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { toOutletStats, toOutletProfile } from "@/entities/outlet";
import type { OutletStats, OutletProfile } from "@/entities/outlet";
import { INDEX_CRITERIA } from "@/entities/cluster";

/** 보도량 추이 차트가 덮는 기간. 화면 캡션과 쿼리가 같은 값을 쓴다. */
export const TREND_DAYS = 30;

/**
 * 언론사 집계는 **전체 기사를 훑는다**(firstMover를 세려면 어쩔 수 없다).
 * 하루 1회 배치로만 값이 변하므로 6시간 캐시로 묶는다.
 *
 * DTO로 바꾼 뒤에 캐시한다 — Prisma row를 캐시하면 JSON 직렬화로 Date가 문자열이 되어
 * 도메인 매핑이 깨진다. → docs/agent/caching.md
 */
export const getOutletStats = unstable_cache(
  async (): Promise<OutletStats[]> => (await findOutletStats()).map(toOutletStats),
  ["outlet-stats", DTO_VERSION],
  { revalidate: CACHE_TTL.outlets, tags: ["clusters", "days"] }
);

export const getOutletProfile = unstable_cache(
  async (outletId: string): Promise<OutletProfile | null> => {
    const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);

    const [allStats, overlaps, daily, recentClusters] = await Promise.all([
      findOutletStats(),
      findOutletOverlap(outletId),
      findOutletDailyCounts(outletId, since),
      findOutletRecentClusters(outletId, INDEX_CRITERIA),
    ]);

    const stats = allStats.find((s) => s.outletId === outletId);
    if (!stats) return null;

    return toOutletProfile({ stats, overlaps, daily, recentClusters });
  },
  ["outlet-profile", DTO_VERSION],
  { revalidate: CACHE_TTL.outlets, tags: ["clusters", "days"] }
);
