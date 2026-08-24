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
 * 사이트맵용 경량 조회. 상세 페이지가 있는 모든 클러스터의 id·updatedAt만.
 * (id+updatedAt만 실어 egress 최소화. sitemap.ts는 revalidate로 조회 빈도를 묶는다.)
 */
export async function findClusterRefs() {
  return db.cluster.findMany({
    orderBy: [{ bucketDate: "desc" }, { id: "desc" }],
    select: { id: true, updatedAt: true },
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
          description: true,
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
