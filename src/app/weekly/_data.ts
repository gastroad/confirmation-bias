import { unstable_cache } from "next/cache";
import { findClustersInRange } from "@server/queries/clusters";
import { findLatestBucketDate } from "@server/queries/days";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import {
  toClusterSummary,
  isIndexableCluster,
  selectMostSplit,
  selectMostShared,
  INDEX_MIN_ARTICLES,
  type ClusterSummary,
} from "@/entities/cluster";

/** 리포트가 덮는 기간(일). 화면 캡션과 쿼리가 같은 값을 쓴다. */
export const WEEK_DAYS = 7;

/** 각 섹션에 몇 개를 싣는가. 선별 기준을 화면에 그대로 밝히므로 숫자도 한 곳에서 온다. */
export const TOP_SPLIT = 10;
export const TOP_SHARED = 5;

/**
 * 편중 목록의 기사 수 하한. 색인 기준(3건)보다 높게 잡는다.
 *
 * 3~4건짜리 이슈는 한 건만 갈려도 ±75%p가 나와 목록이 그런 것들로만 채워졌다.
 * 수치가 과장될 뿐 아니라 "여러 매체가 다뤘는데도 한쪽이 압도했다"는 이 목록의 주장이
 * 성립하지 않는다. 표본이 어느 정도 쌓인 이슈만 후보로 둔다.
 */
export const SPLIT_MIN_ARTICLES = 6;

export interface WeeklyReport {
  /** "YYYY-MM-DD" */
  from: string;
  to: string;
  clusterCount: number;
  articleCount: number;
  /** 한쪽 진영이 크게 앞선 이슈. |tilt| 내림차순. */
  split: ClusterSummary[];
  /** 세 진영이 모두 다룬 이슈. 보도량 내림차순. */
  shared: ClusterSummary[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * 주간 리포트. **정책이 말하는 "선별 게재(curation)"가 이 페이지의 내용 그 자체다** —
 * 무엇을 어떤 기준으로 골랐는지 화면에 밝힌다. → docs/agent/adsense-compliance.md
 *
 * 하루 1회 배치로만 값이 변하므로 6시간 캐시. DTO로 바꾼 뒤에 캐시한다.
 */
export const getWeeklyReport = unstable_cache(
  async (): Promise<WeeklyReport | null> => {
    const latest = await findLatestBucketDate();
    if (!latest) return null;

    const from = new Date(latest.getTime() - (WEEK_DAYS - 1) * 24 * 60 * 60 * 1000);
    const rows = await findClustersInRange(from, latest, INDEX_MIN_ARTICLES);

    // 색인 판정과 같은 기준으로 거른다 — 비교가 성립하지 않는 이슈를 리포트에 실을 이유가 없다.
    const clusters = rows.map(toClusterSummary).filter(isIndexableCluster);

    const split = selectMostSplit(clusters, {
      minArticles: SPLIT_MIN_ARTICLES,
      limit: TOP_SPLIT,
    });
    const shared = selectMostShared(clusters, TOP_SHARED);

    return {
      from: iso(from),
      to: iso(latest),
      clusterCount: clusters.length,
      articleCount: clusters.reduce((n, c) => n + c.articleCount, 0),
      split,
      shared,
    };
  },
  ["weekly-report", DTO_VERSION],
  { revalidate: CACHE_TTL.outlets, tags: ["clusters", "days"] }
);
