import { unstable_cache } from "next/cache";
import { findClusterSummaryPage } from "@server/queries/clusters";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { toClusterSummary } from "@/entities/cluster";
import { parseOutletParam } from "@/features/outlet-filter";
import { DATE_PARAM, parseDateParam } from "@/features/date-nav";
import type { ClustersPage } from "@/entities/cluster";

// **DTO로 바꾼 뒤에 캐시한다.** unstable_cache는 반환값을 JSON 직렬화하므로 Prisma row를
// 그대로 캐시하면 Date가 문자열로 돌아와 도메인 매핑이 깨진다.
const getPage = unstable_cache(
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const outletIds = parseOutletParam(searchParams.get("outlets"));
  const bucketDate = parseDateParam(searchParams.get(DATE_PARAM));

  const body = await getPage(
    cursor,
    Number.isFinite(limit) ? limit : undefined,
    outletIds,
    bucketDate?.toISOString()
  );
  return Response.json(body);
}
