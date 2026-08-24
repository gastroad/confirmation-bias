import { findClusterStats } from "@server/queries/clusters";
import { toClusterStats } from "@/entities/cluster";
import { parseOutletParam } from "@/features/outlet-filter";
import { DATE_PARAM, parseDateParam } from "@/features/date-nav";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletIds = parseOutletParam(searchParams.get("outlets"));
  const bucketDate = parseDateParam(searchParams.get(DATE_PARAM));

  const raw = await findClusterStats(outletIds, bucketDate);
  return Response.json(toClusterStats(raw));
}
