import { findClusterSummaryPage } from "@server/queries/clusters";
import { toClusterSummary } from "@/entities/cluster";
import { parseOutletParam } from "@/features/outlet-filter";
import { DATE_PARAM, parseDateParam } from "@/features/date-nav";
import type { ClustersPage } from "@/entities/cluster";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const outletIds = parseOutletParam(searchParams.get("outlets"));
  const bucketDate = parseDateParam(searchParams.get(DATE_PARAM));

  const { rows, nextCursor } = await findClusterSummaryPage({
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
    outletIds,
    bucketDate,
  });

  const body: ClustersPage = {
    items: rows.map(toClusterSummary),
    nextCursor,
  };
  return Response.json(body);
}
