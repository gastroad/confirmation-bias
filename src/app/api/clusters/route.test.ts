// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

// unstable_cache는 캐시 키/TTL만 얹고 함수를 그대로 돌려준다.
// 여기서 검증할 것은 캐싱 자체가 아니라 **캐시 경계 안쪽이 DTO를 만드는가**이다.
// (Prisma row를 캐시하면 JSON 직렬화로 Date가 문자열이 되어 매핑이 깨진다 → server/cache.ts)
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const findClusterSummaryPage = vi.hoisted(() => vi.fn());
vi.mock("@server/queries/clusters", () => ({ findClusterSummaryPage }));

const { GET } = await import("./route");

const req = (qs = "") => new Request(`http://localhost:3000/api/clusters${qs}`);

const row = (id: string, articles: { outletId: string; publishedAt: string }[] = []) => ({
  id,
  representativeTitle: `이슈 ${id}`,
  summary: null,
  bucketDate: new Date("2026-08-26T00:00:00.000Z"),
  createdAt: new Date("2026-08-27T00:00:00.000Z"),
  articles: articles.map((a) => ({ outletId: a.outletId, publishedAt: new Date(a.publishedAt) })),
});

/** 쿼리에 실제로 넘어간 파라미터. */
const lastArgs = () => findClusterSummaryPage.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  findClusterSummaryPage.mockResolvedValue({ rows: [], nextCursor: null });
});

describe("GET /api/clusters — 파라미터 파싱", () => {
  it("파라미터가 없으면 기본값(undefined)으로 넘긴다 — 쿼리가 스스로 기본을 정한다", async () => {
    await GET(req());
    expect(lastArgs()).toEqual({
      cursor: undefined,
      limit: undefined,
      outletIds: [],
      bucketDate: undefined,
    });
  });

  it("cursor를 그대로 전달한다", async () => {
    await GET(req("?cursor=abc-123"));
    expect(lastArgs().cursor).toBe("abc-123");
  });

  it("limit을 숫자로 바꾼다", async () => {
    await GET(req("?limit=5"));
    expect(lastArgs().limit).toBe(5);
  });

  it("숫자가 아닌 limit은 무시한다 — NaN을 쿼리로 넘기지 않는다", async () => {
    for (const bogus of ["abc", "1e999", "Infinity"]) {
      await GET(req(`?limit=${bogus}`));
      expect(lastArgs().limit).toBeUndefined();
    }
  });

  it("언론사 필터를 명단으로 거른다 — 임의의 문자열이 쿼리에 닿지 않는다", async () => {
    await GET(req("?outlets=hani,ghost-media,chosun"));
    expect(lastArgs().outletIds).toEqual(["hani", "chosun"]);
  });

  it("date를 UTC 자정 Date로 바꾼다 (@db.Date 컬럼과 맞춘다)", async () => {
    await GET(req("?date=2026-08-26"));
    expect(lastArgs().bucketDate?.toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });

  it("형식이 어긋난 date는 500이 아니라 '필터 없음'이 된다", async () => {
    const res = await GET(req("?date=2026-13-99"));
    expect(res.status).toBe(200);
    expect(lastArgs().bucketDate).toBeUndefined();
  });
});

describe("GET /api/clusters — 응답", () => {
  it("Prisma row가 아니라 DTO를 돌려준다", async () => {
    findClusterSummaryPage.mockResolvedValue({
      rows: [row("c1", [{ outletId: "hani", publishedAt: "2026-08-26T05:00:00.000Z" }])],
      nextCursor: null,
    });

    const body = await (await GET(req())).json();
    const [item] = body.items;
    // Date가 남아 있으면 캐시를 통과하는 순간 깨진다
    expect(item.bucketDate).toBe("2026-08-26");
    expect(item.latestPublishedAt).toBe("2026-08-26T05:00:00.000Z");
    expect(item.leaningDistribution.left).toBe(1);
    expect(item.tilt).toBeCloseTo(100);
  });

  it("nextCursor를 그대로 싣는다 (무한 스크롤의 다음 페이지)", async () => {
    findClusterSummaryPage.mockResolvedValue({ rows: [row("c1")], nextCursor: "c1" });
    expect((await (await GET(req())).json()).nextCursor).toBe("c1");
  });

  it("결과가 없으면 빈 목록과 null 커서다 — 404가 아니다", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], nextCursor: null });
  });

  it("응답이 JSON으로 왕복 가능하다", async () => {
    findClusterSummaryPage.mockResolvedValue({ rows: [row("c1")], nextCursor: null });
    const body = await (await GET(req())).json();
    expect(JSON.parse(JSON.stringify(body))).toEqual(body);
  });
});
