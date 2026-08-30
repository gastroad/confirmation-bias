// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const findDaySummaries = vi.hoisted(() => vi.fn());
vi.mock("@server/queries/days", () => ({ findDaySummaries }));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  findDaySummaries.mockResolvedValue([]);
});

describe("GET /api/days", () => {
  it("@db.Date를 YYYY-MM-DD 문자열로 바꿔 돌려준다", async () => {
    findDaySummaries.mockResolvedValue([
      { bucketDate: new Date("2026-08-26T00:00:00.000Z"), clusterCount: 12, articleCount: 340 },
      { bucketDate: new Date("2026-08-25T00:00:00.000Z"), clusterCount: 8, articleCount: 210 },
    ]);

    expect(await (await GET()).json()).toEqual([
      { date: "2026-08-26", clusterCount: 12, articleCount: 340 },
      { date: "2026-08-25", clusterCount: 8, articleCount: 210 },
    ]);
  });

  it("쿼리 순서를 뒤집지 않는다 — 정렬은 DB가 정한다", async () => {
    findDaySummaries.mockResolvedValue(
      ["2026-08-24", "2026-08-26", "2026-08-25"].map((d) => ({
        bucketDate: new Date(`${d}T00:00:00.000Z`),
        clusterCount: 1,
        articleCount: 1,
      }))
    );
    const body = await (await GET()).json();
    expect(body.map((d: { date: string }) => d.date)).toEqual([
      "2026-08-24",
      "2026-08-26",
      "2026-08-25",
    ]);
  });

  it("데이터가 없으면 빈 배열이다", async () => {
    expect(await (await GET()).json()).toEqual([]);
  });
});
