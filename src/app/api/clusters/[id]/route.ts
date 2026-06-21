import { findClusterDetailRow } from "@server/queries/clusters";
import { toClusterDetail } from "@/entities/cluster";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await findClusterDetailRow(id);

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(toClusterDetail(row));
}
