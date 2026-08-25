import { unstable_cache } from "next/cache";
import { findDaySummaries } from "@server/queries/days";
import { CACHE_TTL, DTO_VERSION } from "@server/cache";
import { toDaySummary } from "@/entities/cluster";

// 날짜 축은 하루 1회만 늘어난다. 내비게이션이 매 요청 DB를 칠 이유가 없다.
const getDays = unstable_cache(
  async () => (await findDaySummaries()).map(toDaySummary),
  ["days", DTO_VERSION],
  {
    revalidate: CACHE_TTL.days,
    tags: ["days"],
  }
);

export async function GET() {
  return Response.json(await getDays());
}
