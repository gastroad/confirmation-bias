import { db } from "../db";

/**
 * 언론사별 집계. `/outlets`와 `/outlets/[id]`가 쓴다.
 *
 * 여기서 나오는 값은 **전부 우리가 계산한 것이고 원문 복제가 0이다** — 언론사 페이지를
 * 만드는 이유가 그것이다. → docs/agent/adsense-compliance.md
 */

export interface OutletStatsRow {
  outletId: string;
  articleCount: number;
  clusterCount: number;
  /** 이 매체 말고 아무도 다루지 않은 이슈 수. */
  soloCount: number;
  /** 이 매체가 가장 먼저 보도한 이슈 수(같은 시각이면 outletId 사전순으로 결정적). */
  firstMoverCount: number;
  firstDate: Date | null;
  lastDate: Date | null;
}

/**
 * 언론사 18곳 전부를 한 번에. 페이지마다 따로 물으면 왕복이 18배가 되고,
 * `firstMover`는 어차피 전체 기사를 훑어야 나온다.
 */
export async function findOutletStats(): Promise<OutletStatsRow[]> {
  return db.$queryRawUnsafe<OutletStatsRow[]>(
    `WITH art AS (
       SELECT a."outletId", a."clusterId", a."bucketDate", a."publishedAt" FROM "Article" a
     ),
     first_by_cluster AS (
       SELECT DISTINCT ON ("clusterId") "clusterId", "outletId"
       FROM art WHERE "clusterId" IS NOT NULL
       ORDER BY "clusterId", "publishedAt" ASC, "outletId" ASC
     ),
     outlets_per_cluster AS (
       SELECT "clusterId", count(DISTINCT "outletId") AS n
       FROM art WHERE "clusterId" IS NOT NULL GROUP BY "clusterId"
     )
     SELECT o.id AS "outletId",
            count(art."outletId")::int AS "articleCount",
            count(DISTINCT art."clusterId")::int AS "clusterCount",
            (count(DISTINCT art."clusterId") FILTER (WHERE opc.n = 1))::int AS "soloCount",
            (SELECT count(*)::int FROM first_by_cluster f WHERE f."outletId" = o.id)
              AS "firstMoverCount",
            min(art."bucketDate") AS "firstDate",
            max(art."bucketDate") AS "lastDate"
     FROM "Outlet" o
     LEFT JOIN art ON art."outletId" = o.id
     LEFT JOIN outlets_per_cluster opc ON opc."clusterId" = art."clusterId"
     GROUP BY o.id`
  );
}

export interface OutletOverlapRow {
  outletId: string;
  sharedClusters: number;
}

/** 같은 이슈를 가장 자주 함께 다룬 매체. "누구와 의제가 겹치는가"를 보여준다. */
export async function findOutletOverlap(outletId: string, limit = 5) {
  return db.$queryRawUnsafe<OutletOverlapRow[]>(
    `SELECT a2."outletId" AS "outletId", count(DISTINCT a1."clusterId")::int AS "sharedClusters"
     FROM "Article" a1
     JOIN "Article" a2 ON a2."clusterId" = a1."clusterId" AND a2."outletId" <> a1."outletId"
     WHERE a1."outletId" = $1 AND a1."clusterId" IS NOT NULL
     GROUP BY a2."outletId"
     ORDER BY "sharedClusters" DESC, a2."outletId" ASC
     LIMIT $2::int`,
    outletId,
    limit
  );
}

export interface OutletDailyRow {
  bucketDate: Date;
  count: number;
}

export async function findOutletDailyCounts(outletId: string, since: Date) {
  return db.$queryRawUnsafe<OutletDailyRow[]>(
    `SELECT "bucketDate", count(*)::int AS count
     FROM "Article"
     WHERE "outletId" = $1 AND "bucketDate" >= $2::date
     GROUP BY 1 ORDER BY 1`,
    outletId,
    since
  );
}

export interface OutletClusterRefRow {
  id: string;
  representativeTitle: string;
  bucketDate: Date;
  articleCount: number;
}

/**
 * 이 매체가 참여한 최근 이슈. **색인 기준을 넘긴 것만** 고른다 —
 * 껍데기 페이지로 내부 링크를 흘려보낼 이유가 없다(기준은 호출자가 넘긴다).
 */
export async function findOutletRecentClusters(
  outletId: string,
  criteria: {
    minArticles: number;
    minLeaningGroups: number;
    groupByLeaning: Record<string, string>;
  },
  limit = 10
) {
  const entries = Object.entries(criteria.groupByLeaning);
  return db.$queryRawUnsafe<OutletClusterRefRow[]>(
    `WITH grp AS (SELECT * FROM unnest($1::text[], $2::text[]) AS t(leaning, name))
     SELECT cl.id, cl."representativeTitle", cl."bucketDate", cl."articleCount"
     FROM "Cluster" cl
     JOIN "Article" a ON a."clusterId" = cl.id
     JOIN "Outlet" o ON o.id = a."outletId"
     LEFT JOIN grp ON grp.leaning = o.leaning
     WHERE cl."articleCount" >= $3::int
       AND EXISTS (
         SELECT 1 FROM "Article" mine
         WHERE mine."clusterId" = cl.id AND mine."outletId" = $5
       )
     GROUP BY cl.id, cl."representativeTitle", cl."bucketDate", cl."articleCount"
     HAVING count(DISTINCT grp.name) >= $4::int
     ORDER BY cl."bucketDate" DESC, cl."articleCount" DESC, cl.id DESC
     LIMIT $6::int`,
    entries.map(([l]) => l),
    entries.map(([, g]) => g),
    criteria.minArticles,
    criteria.minLeaningGroups,
    outletId,
    limit
  );
}
