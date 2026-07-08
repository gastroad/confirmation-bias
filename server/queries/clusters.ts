import { db } from "../db";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

interface ListParams {
  cursor?: string;
  limit?: number;
  outletIds?: string[];
}

function clusterWhere(outletIds?: string[]) {
  // 선택 언론사가 보도한 클러스터만. 분포는 전체 기사 기준으로 계산하므로
  // include 범위는 좁히지 않고 클러스터만 거른다.
  return outletIds && outletIds.length > 0
    ? { articles: { some: { outletId: { in: outletIds } } } }
    : undefined;
}

/**
 * 커서 기반 클러스터 페이지 조회.
 * 정렬은 updatedAt desc, 동률은 id desc로 결정적. 커서는 마지막 항목의 id.
 */
export async function findClusterSummaryPage({ cursor, limit, outletIds }: ListParams) {
  const take = Math.min(Math.max(limit ?? DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);

  const rows = await db.cluster.findMany({
    where: clusterWhere(outletIds),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      representativeTitle: true,
      summary: true,
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
    orderBy: { updatedAt: "desc" },
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
export async function findClusterStats(outletIds?: string[]) {
  const where = clusterWhere(outletIds);

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
