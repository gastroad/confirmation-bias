import { unstable_cache } from "next/cache";
import { findClusterStats } from "@server/queries/clusters";
import { CACHE_TTL } from "@server/cache";
import { toClusterStats } from "@/entities/cluster";
import { parseOutletParam } from "@/features/outlet-filter";
import { DATE_PARAM, parseDateParam } from "@/features/date-nav";

const getStats = unstable_cache(
  async (outletIds: string[], bucketDateIso: string | undefined) => {
    const raw = await findClusterStats(
      outletIds,
      bucketDateIso ? new Date(bucketDateIso) : undefined
    );
    return toClusterStats(raw);
  },
  ["clusters-stats"],
  { revalidate: CACHE_TTL.clusterList, tags: ["clusters"] }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletIds = parseOutletParam(searchParams.get("outlets"));
  const bucketDate = parseDateParam(searchParams.get(DATE_PARAM));

  return Response.json(await getStats(outletIds, bucketDate?.toISOString()));
}
