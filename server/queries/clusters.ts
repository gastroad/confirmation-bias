import { db } from "../db";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

interface ListParams {
  cursor?: string;
  limit?: number;
  outletIds?: string[];
  /** 지정하면 그 KST 하루만. 없으면 전체 기간을 최신순으로. */
  bucketDate?: Date;
}

function clusterWhere(outletIds?: string[], bucketDate?: Date) {
  // 선택 언론사가 보도한 클러스터만. 분포는 전체 기사 기준으로 계산하므로
  // include 범위는 좁히지 않고 클러스터만 거른다.
  const outletFilter =
    outletIds && outletIds.length > 0
      ? { articles: { some: { outletId: { in: outletIds } } } }
      : undefined;

  if (!outletFilter && !bucketDate) return undefined;
  return { ...outletFilter, ...(bucketDate ? { bucketDate } : {}) };
}

/**
 * 커서 기반 클러스터 페이지 조회.
 *
 * 정렬은 **최신 날짜 → 그날의 큰 이슈 순**(bucketDate desc, articleCount desc), 동률은 id desc로
 * 결정적. 일별 배치로 바꾸면서 updatedAt은 "배치가 돈 시각"이 되어 정렬 기준으로서 의미를 잃었다.
 * 커서는 마지막 항목의 id이며, orderBy에 unique 컬럼(id)이 포함되어 있어야 유효하다.
 */
export async function findClusterSummaryPage({ cursor, limit, outletIds, bucketDate }: ListParams) {
  const take = Math.min(Math.max(limit ?? DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);

  const rows = await db.cluster.findMany({
    where: clusterWhere(outletIds, bucketDate),
    orderBy: [{ bucketDate: "desc" }, { articleCount: "desc" }, { id: "desc" }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      representativeTitle: true,
      summary: true,
      bucketDate: true,
      createdAt: true,
      articles: { select: { outletId: true, publishedAt: true } },
    },
  });

  const nextCursor = rows.length === take ? rows[rows.length - 1].id : null;
  return { rows, nextCursor };
}

/**
 * 색인 기준. **도메인 상수(`INDEX_MIN_ARTICLES` 등)는 `src/entities/cluster`에 있고**
 * `server/`는 그걸 import할 수 없으므로(레이어 방향) 호출자가 값을 넘긴다.
 * 임계값이 두 곳에 갈리지 않게 하려는 것이다.
 */
export interface IndexCriteria {
  minArticles: number;
  minLeaningGroups: number;
  /** leaning → 진영 그룹 이름. 어느 그룹에도 없는 leaning(`unknown`)은 세지 않는다. */
  groupByLeaning: Record<string, string>;
}

function criteriaParams({ minArticles, minLeaningGroups, groupByLeaning }: IndexCriteria) {
  const entries = Object.entries(groupByLeaning);
  return [entries.map(([l]) => l), entries.map(([, g]) => g), minArticles, minLeaningGroups];
}

interface ClusterRefRow {
  id: string;
  updatedAt: Date;
  bucketDate: Date;
}

/**
 * 사이트맵용 경량 조회. **색인 기준을 넘긴 클러스터만.**
 *
 * 성향 그룹 수는 Prisma로 표현할 수 없어 raw SQL이다. 1만 건을 전부 DTO로 만들어 거르는
 * 것보다 DB에서 거르는 편이 egress·메모리 양쪽에서 싸다. 판정 결과는 상세 페이지의
 * `isIndexableCluster`(DTO 기반)와 같아야 한다.
 */
export async function findIndexableClusterRefs(criteria: IndexCriteria) {
  return db.$queryRawUnsafe<ClusterRefRow[]>(
    `WITH grp AS (SELECT * FROM unnest($1::text[], $2::text[]) AS t(leaning, name))
     SELECT cl.id, cl."updatedAt", cl."bucketDate"
     FROM "Cluster" cl
     JOIN "Article" a ON a."clusterId" = cl.id
     JOIN "Outlet" o ON o.id = a."outletId"
     LEFT JOIN grp ON grp.leaning = o.leaning
     WHERE cl."articleCount" >= $3::int
     GROUP BY cl.id, cl."updatedAt", cl."bucketDate"
     HAVING count(DISTINCT grp.name) >= $4::int
     ORDER BY cl."bucketDate" DESC, cl.id DESC`,
    ...criteriaParams(criteria)
  );
}

/**
 * 그 날짜에 색인 기준을 넘긴 클러스터가 몇 개인가. 0이면 날짜 페이지도 색인에서 뺀다
 * (껍데기만 모인 날짜가 색인되면 그 자체로 품질 감점이다).
 */
export async function countIndexableClusters(
  bucketDate: Date,
  criteria: IndexCriteria
): Promise<number> {
  const [row] = await db.$queryRawUnsafe<{ count: number }[]>(
    `WITH grp AS (SELECT * FROM unnest($1::text[], $2::text[]) AS t(leaning, name)),
          keep AS (
       SELECT cl.id
       FROM "Cluster" cl
       JOIN "Article" a ON a."clusterId" = cl.id
       JOIN "Outlet" o ON o.id = a."outletId"
       LEFT JOIN grp ON grp.leaning = o.leaning
       WHERE cl."articleCount" >= $3::int AND cl."bucketDate" = $5::date
       GROUP BY cl.id
       HAVING count(DISTINCT grp.name) >= $4::int
     )
     SELECT count(*)::int AS count FROM keep`,
    ...criteriaParams(criteria),
    bucketDate
  );
  return row?.count ?? 0;
}

/**
 * 날짜 구간의 클러스터. 주간 리포트가 쓴다.
 *
 * `minArticles`로 1차로 거른 뒤 색인 판정은 호출자가 DTO로 마무리한다 —
 * 진영 수까지 SQL로 세는 것보다 이쪽이 정확하고(같은 `isIndexableCluster`를 쓴다)
 * 한 주 분량이면 양도 얼마 안 된다.
 */
export async function findClustersInRange(from: Date, to: Date, minArticles: number) {
  return db.cluster.findMany({
    where: { bucketDate: { gte: from, lte: to }, articleCount: { gte: minArticles } },
    orderBy: [{ bucketDate: "desc" }, { articleCount: "desc" }, { id: "desc" }],
    select: {
      id: true,
      representativeTitle: true,
      summary: true,
      bucketDate: true,
      createdAt: true,
      articles: { select: { outletId: true, publishedAt: true } },
    },
  });
}

export async function findClusterDetailRow(id: string) {
  return db.cluster.findUnique({
    where: { id },
    select: {
      id: true,
      representativeTitle: true,
      summary: true,
      bucketDate: true,
      createdAt: true,
      articles: {
        orderBy: { publishedAt: "asc" },
        select: {
          id: true,
          title: true,
          url: true,
          publishedAt: true,
          outletId: true,
          outlet: { select: { name: true, domain: true, leaning: true } },
        },
      },
    },
  });
}

/**
 * 필터 적용된 전체 집계(목록 전체 기준). 무한 스크롤로 일부만 로드해도
 * StatsBar가 정확한 총계를 보여줄 수 있도록 count/groupBy로 가볍게 계산한다.
 */
export async function findClusterStats(outletIds?: string[], bucketDate?: Date) {
  const where = clusterWhere(outletIds, bucketDate);

  const [clusterCount, articleGroups] = await Promise.all([
    db.cluster.count({ where }),
    db.article.groupBy({
      by: ["outletId"],
      where: where ? { cluster: where } : { clusterId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const articleCount = articleGroups.reduce((sum, g) => sum + g._count._all, 0);
  const outletCounts = articleGroups.map((g) => ({
    outletId: g.outletId,
    count: g._count._all,
  }));

  return { clusterCount, articleCount, outletCounts };
}
