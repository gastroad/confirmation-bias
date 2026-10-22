import {
  OUTLETS_PARAM,
  DATE_PARAM,
  CURSOR_PARAM,
  LIMIT_PARAM,
} from "@/shared/config/search-params";
import type { ClustersPage, ClusterStats, DaySummary } from "./model";

// 클라이언트 전용 fetcher. DB 접근은 server/ + API 라우트가 담당하고,
// 여기서는 파라미터만 실어 HTTP로 호출한다.

/**
 * 목록·집계의 react-query 키. **위젯(클라이언트)과 app 레이어(첫 화면 SSR seed)가 함께
 * 쓰는 계약이라 여기 둔다** — 키가 한 글자라도 어긋나면 서버가 심어 둔 데이터를 위젯이
 * 못 찾아 초기 HTML이 다시 스켈레톤으로 돌아간다. → src/app/_feed-seed.ts
 */
export const clusterQueryKeys = {
  page: (outletIds: string[], date?: string) =>
    ["clusters", outletIds.join(","), date ?? ""] as const,
  stats: (outletIds: string[], date?: string) =>
    ["cluster-stats", outletIds.join(","), date ?? ""] as const,
};

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
