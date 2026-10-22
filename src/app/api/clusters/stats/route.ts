import { getClusterStats } from "../../../_cluster-data";
import { parseOutletParam } from "@/features/outlet-filter";
import { parseDateParam } from "@/features/date-nav";
import { OUTLETS_PARAM, DATE_PARAM } from "@/shared/config/search-params";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletIds = parseOutletParam(searchParams.get(OUTLETS_PARAM));
  const bucketDate = parseDateParam(searchParams.get(DATE_PARAM));

  return Response.json(await getClusterStats(outletIds, bucketDate?.toISOString()));
}
