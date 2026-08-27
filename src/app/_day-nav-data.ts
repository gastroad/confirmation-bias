import { unstable_cache } from "next/cache";
import {
  findLatestBucketDate,
  findDaySummary,
  findAdjacentBucketDates,
} from "@server/queries/days";
import { countIndexableClusters } from "@server/queries/clusters";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { INDEX_CRITERIA } from "@/entities/cluster";

/**
 * 날짜 내비게이션이 쓰는 값들. 홈과 `/d/[date]`가 공유한다.
 *
 * **Date를 넘기지 않고 ISO 문자열로 주고받는다** — `unstable_cache`는 반환값을 JSON
 * 직렬화하므로 Date가 문자열로 돌아온다. 어차피 화면은 "YYYY-MM-DD"만 쓴다.
 */
export interface DayNavData {
  date: string;
  prevDate: string | null;
  nextDate: string | null;
  clusterCount: number;
  articleCount: number;
  /** 색인 기준을 넘긴 클러스터 수. 0이면 이 날짜 페이지는 색인에서 뺀다. */
  indexableClusterCount: number;
}

const toIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const getDayNav = unstable_cache(
  async (dateIso: string): Promise<DayNavData> => {
    const bucket = new Date(`${dateIso}T00:00:00Z`);
    const [summary, adjacent, indexableClusterCount] = await Promise.all([
      findDaySummary(bucket),
      findAdjacentBucketDates(bucket),
      countIndexableClusters(bucket, INDEX_CRITERIA),
    ]);
    return {
      date: dateIso,
      prevDate: toIso(adjacent.prev),
      nextDate: toIso(adjacent.next),
      clusterCount: summary?.clusterCount ?? 0,
      articleCount: summary?.articleCount ?? 0,
      indexableClusterCount,
    };
  },
  ["day-nav", DTO_VERSION],
  { revalidate: CACHE_TTL.days, tags: ["days"] }
);

/** 데이터가 있는 가장 최근 날짜("YYYY-MM-DD"). 없으면 null. */
export const getLatestDate = unstable_cache(
  async (): Promise<string | null> => toIso(await findLatestBucketDate()),
  ["latest-date", DTO_VERSION],
  { revalidate: CACHE_TTL.days, tags: ["days"] }
);
