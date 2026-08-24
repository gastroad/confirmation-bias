import { findDaySummaries } from "@server/queries/days";
import { toDaySummary } from "@/entities/cluster";

// 날짜 내비게이션용. 하루 1회만 갱신되는 데이터라 재검증 주기를 길게 잡아
// 크롤러·재방문이 매번 DB를 치지 않게 한다.
export const revalidate = 3600;

export async function GET() {
  const rows = await findDaySummaries();
  return Response.json(rows.map(toDaySummary));
}
