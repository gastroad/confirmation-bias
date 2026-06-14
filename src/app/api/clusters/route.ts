import { getClusters } from "@/entities/cluster";

export async function GET() {
  const summaries = await getClusters();
  return Response.json(summaries);
}
