import { getClustersPage } from "../../_cluster-data";
import { parseOutletParam } from "@/features/outlet-filter";
import { parseDateParam } from "@/features/date-nav";
import {
  OUTLETS_PARAM,
  DATE_PARAM,
  CURSOR_PARAM,
  LIMIT_PARAM,
} from "@/shared/config/search-params";

// 첫 페이지는 서버 컴포넌트가 같은 캐시(`_cluster-data`)로 미리 그린다 → src/app/_feed-seed.ts.
// 이 라우트는 무한 스크롤의 2페이지부터와 필터 전환을 받는다.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const cursor = searchParams.get(CURSOR_PARAM) ?? undefined;
  const limitParam = searchParams.get(LIMIT_PARAM);
  const limit = limitParam ? Number(limitParam) : undefined;
  const outletIds = parseOutletParam(searchParams.get(OUTLETS_PARAM));
  const bucketDate = parseDateParam(searchParams.get(DATE_PARAM));

  const body = await getClustersPage(
    cursor,
    Number.isFinite(limit) ? limit : undefined,
    outletIds,
    bucketDate?.toISOString()
  );
  return Response.json(body);
}
