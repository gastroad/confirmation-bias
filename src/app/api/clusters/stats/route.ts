import { findClusterStats } from "@server/queries/clusters";
import { toClusterStats } from "@/entities/cluster";
import { parseOutletParam } from "@/features/outlet-filter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletIds = parseOutletParam(searchParams.get("outlets"));

  const raw = await findClusterStats(outletIds);
  return Response.json(toClusterStats(raw));
}
