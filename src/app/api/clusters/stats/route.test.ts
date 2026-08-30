// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const findClusterStats = vi.hoisted(() => vi.fn());
vi.mock("@server/queries/clusters", () => ({ findClusterStats }));

const { GET } = await import("./route");

const req = (qs = "") => new Request(`http://localhost:3000/api/clusters/stats${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  findClusterStats.mockResolvedValue({ clusterCount: 0, articleCount: 0, outletCounts: [] });
});

describe("GET /api/clusters/stats", () => {
  it("언론사 필터와 날짜를 쿼리에 넘긴다", async () => {
    await GET(req("?outlets=hani,chosun&date=2026-08-26"));
    const [outletIds, bucketDate] = findClusterStats.mock.calls.at(-1)!;
    expect(outletIds).toEqual(["hani", "chosun"]);
    expect(bucketDate.toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });

  it("파라미터가 없으면 전 기간·전체 매체다", async () => {
    await GET(req());
    expect(findClusterStats.mock.calls.at(-1)).toEqual([[], undefined]);
  });

  it("언론사별 건수를 성향 분포 DTO로 합쳐 돌려준다", async () => {
    findClusterStats.mockResolvedValue({
      clusterCount: 12,
      articleCount: 30,
      outletCounts: [
        { outletId: "hani", count: 10 },
        { outletId: "chosun", count: 20 },
      ],
    });

    const body = await (await GET(req())).json();
    expect(body.leaningDistribution.left).toBe(10);
    expect(body.leaningDistribution.right).toBe(20);
    expect(body.dominantLeaning).toBe("right");
    expect(body.clusterCount).toBe(12);
  });

  it("집계가 비어도 200과 0 분포를 준다 — 화면이 스켈레톤에 갇히지 않게", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dominantLeaning).toBeNull();
    expect(Object.values(body.leaningDistribution).every((v) => v === 0)).toBe(true);
  });
});
