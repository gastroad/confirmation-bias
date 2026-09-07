import {
  OUTLETS_PARAM,
  DATE_PARAM,
  CURSOR_PARAM,
  LIMIT_PARAM,
} from "@/shared/config/search-params";
import type { ClustersPage, ClusterStats, DaySummary } from "./model";

// 클라이언트 전용 fetcher. DB 접근은 server/ + API 라우트가 담당하고,
// 여기서는 파라미터만 실어 HTTP로 호출한다.

interface FetchClustersParams {
  cursor?: string | null;
  limit?: number;
  outletIds?: string[];
  /** "YYYY-MM-DD". 지정하면 그 하루만. */
  date?: string;
}

export async function fetchClustersPage({
  cursor,
  limit,
  outletIds,
  date,
}: FetchClustersParams = {}): Promise<ClustersPage> {
  const params = new URLSearchParams();
  if (cursor) params.set(CURSOR_PARAM, cursor);
  if (limit) params.set(LIMIT_PARAM, String(limit));
  if (outletIds && outletIds.length > 0) params.set(OUTLETS_PARAM, outletIds.join(","));
  if (date) params.set(DATE_PARAM, date);

  const res = await fetch(`/api/clusters?${params.toString()}`);
  if (!res.ok) throw new Error(`클러스터 목록 조회 실패 (${res.status})`);
  return res.json();
}

export async function fetchClusterStats(
  outletIds?: string[],
  date?: string
): Promise<ClusterStats> {
  const params = new URLSearchParams();
  if (outletIds && outletIds.length > 0) params.set(OUTLETS_PARAM, outletIds.join(","));
  if (date) params.set(DATE_PARAM, date);
  const qs = params.toString();

  const res = await fetch(`/api/clusters/stats${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`통계 조회 실패 (${res.status})`);
  return res.json();
}

export async function fetchDays(): Promise<DaySummary[]> {
  const res = await fetch("/api/days");
  if (!res.ok) throw new Error(`날짜 목록 조회 실패 (${res.status})`);
  return res.json();
}
