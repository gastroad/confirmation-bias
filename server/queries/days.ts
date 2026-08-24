import { db } from "../db";

/**
 * 날짜별 집계. 날짜 내비게이션과 sitemap이 쓴다.
 *
 * `Cluster.articleCount`가 비정규화되어 있어 Article을 훑지 않고 Cluster만으로 계산한다.
 */
export async function findDaySummaries() {
  const rows = await db.cluster.groupBy({
    by: ["bucketDate"],
    _count: { _all: true },
    _sum: { articleCount: true },
    orderBy: { bucketDate: "desc" },
  });

  return rows.map((r) => ({
    bucketDate: r.bucketDate,
    clusterCount: r._count._all,
    articleCount: r._sum.articleCount ?? 0,
  }));
}

/** 특정 하루만. 날짜 페이지가 내비게이션 표시에 쓴다(전체 목록을 끌어오지 않기 위해 분리). */
export async function findDaySummary(bucketDate: Date) {
  const [agg] = await db.cluster.groupBy({
    by: ["bucketDate"],
    where: { bucketDate },
    _count: { _all: true },
    _sum: { articleCount: true },
  });
  if (!agg) return null;
  return {
    bucketDate: agg.bucketDate,
    clusterCount: agg._count._all,
    articleCount: agg._sum.articleCount ?? 0,
  };
}

/** 데이터가 있는 가장 최근 날짜. 홈이 이 날짜를 렌더한다. */
export async function findLatestBucketDate(): Promise<Date | null> {
  const row = await db.cluster.findFirst({
    orderBy: { bucketDate: "desc" },
    select: { bucketDate: true },
  });
  return row?.bucketDate ?? null;
}

/** 해당 날짜의 앞뒤 날짜. 없으면 null(내비게이션에서 비활성). */
export async function findAdjacentBucketDates(bucketDate: Date) {
  const [prev, next] = await Promise.all([
    db.cluster.findFirst({
      where: { bucketDate: { lt: bucketDate } },
      orderBy: { bucketDate: "desc" },
      select: { bucketDate: true },
    }),
    db.cluster.findFirst({
      where: { bucketDate: { gt: bucketDate } },
      orderBy: { bucketDate: "asc" },
      select: { bucketDate: true },
    }),
  ]);
  return { prev: prev?.bucketDate ?? null, next: next?.bucketDate ?? null };
}
