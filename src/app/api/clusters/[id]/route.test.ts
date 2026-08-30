// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

const findClusterDetailRow = vi.hoisted(() => vi.fn());
vi.mock("@server/queries/clusters", () => ({ findClusterDetailRow }));

const { GET } = await import("./route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (id: string) => new Request(`http://localhost:3000/api/clusters/${id}`);

const detailRow = () => ({
  id: "cl-1",
  representativeTitle: "국회 본회의 통과",
  summary: "3개 언론사가 보도했습니다.",
  bucketDate: new Date("2026-08-26T00:00:00.000Z"),
  createdAt: new Date("2026-08-27T00:00:00.000Z"),
  articles: [
    {
      id: "a1",
      title: "기사 A",
      url: "https://hani.co.kr/a",
      publishedAt: new Date("2026-08-26T01:30:00.000Z"),
      outletId: "hani",
      outlet: { name: "한겨레신문", domain: "hani.co.kr", leaning: "left" },
    },
    {
      id: "a2",
      title: "기사 B",
      url: "https://chosun.com/b",
      publishedAt: new Date("2026-08-26T03:10:00.000Z"),
      outletId: "chosun",
      outlet: { name: "조선일보", domain: "chosun.com", leaning: "right" },
    },
  ],
});

beforeEach(() => vi.clearAllMocks());

describe("GET /api/clusters/[id]", () => {
  it("id로 조회해 상세 DTO를 돌려준다", async () => {
    findClusterDetailRow.mockResolvedValue(detailRow());
    const res = await GET(req("cl-1"), ctx("cl-1"));

    expect(findClusterDetailRow).toHaveBeenCalledWith("cl-1");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.bucketDate).toBe("2026-08-26");
    expect(body.articles).toHaveLength(2);
    expect(body.articles[0].publishedAt).toBe("2026-08-26T01:30:00.000Z");
    expect(body.timeline).toEqual([
      { hour: "2026-08-26T01:00:00.000Z", count: 1 },
      { hour: "2026-08-26T03:00:00.000Z", count: 1 },
    ]);
  });

  it("없으면 404다 — 빈 상세를 200으로 주지 않는다", async () => {
    findClusterDetailRow.mockResolvedValue(null);
    const res = await GET(req("gone"), ctx("gone"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("재클러스터링으로 사라진 옛 id도 404다 (클러스터 id는 배치마다 바뀐다)", async () => {
    findClusterDetailRow.mockResolvedValue(null);
    expect((await GET(req("old-id"), ctx("old-id"))).status).toBe(404);
  });

  it("응답이 JSON으로 왕복 가능하다", async () => {
    findClusterDetailRow.mockResolvedValue(detailRow());
    const body = await (await GET(req("cl-1"), ctx("cl-1"))).json();
    expect(JSON.parse(JSON.stringify(body))).toEqual(body);
  });
});
