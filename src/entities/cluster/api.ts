import type { ClustersPage, ClusterStats } from "./model";

// 클라이언트 전용 fetcher. DB 접근은 server/ + API 라우트가 담당하고,
// 여기서는 파라미터만 실어 HTTP로 호출한다.

interface FetchClustersParams {
  cursor?: string | null;
  limit?: number;
  outletIds?: string[];
}

export async function fetchClustersPage({
  cursor,
  limit,
  outletIds,
}: FetchClustersParams = {}): Promise<ClustersPage> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  if (outletIds && outletIds.length > 0) params.set("outlets", outletIds.join(","));

  const res = await fetch(`/api/clusters?${params.toString()}`);
  if (!res.ok) throw new Error(`클러스터 목록 조회 실패 (${res.status})`);
  return res.json();
}

export async function fetchClusterStats(outletIds?: string[]): Promise<ClusterStats> {
  const params = new URLSearchParams();
  if (outletIds && outletIds.length > 0) params.set("outlets", outletIds.join(","));
  const qs = params.toString();

  const res = await fetch(`/api/clusters/stats${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`통계 조회 실패 (${res.status})`);
  return res.json();
}
