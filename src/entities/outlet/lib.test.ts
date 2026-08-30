import { describe, it, expect } from "vitest";
import {
  buildOutletSummary,
  ratioPercent,
  sortOutletsByVolume,
  toOutletStats,
  toOutletProfile,
} from "./lib";
import { OUTLET_MAP } from "./model";
import type { OutletProfile, OutletStats } from "./model";

const stats = (over: Partial<OutletStats> = {}): OutletStats => ({
  outletId: "hani",
  articleCount: 1407,
  clusterCount: 1297,
  soloCount: 775,
  firstMoverCount: 807,
  firstDate: "2026-06-29",
  lastDate: "2026-08-26",
  ...over,
});

const profile = (over: Partial<OutletProfile> = {}): OutletProfile => ({
  outlet: OUTLET_MAP.hani,
  stats: stats(),
  overlaps: [
    { outletId: "yonhap", sharedClusters: 302 },
    { outletId: "newsis", sharedClusters: 260 },
    { outletId: "chosun", sharedClusters: 249 },
    { outletId: "segye", sharedClusters: 212 },
  ],
  daily: [],
  recentClusters: [],
  ...over,
});

describe("ratioPercent", () => {
  it("0으로 나누지 않는다", () => {
    expect(ratioPercent(5, 0)).toBe(0);
  });

  it("소수 첫째 자리까지 반올림한다", () => {
    expect(ratioPercent(775, 1297)).toBe(59.8);
  });
});

describe("toOutletStats", () => {
  it("@db.Date를 YYYY-MM-DD 문자열로 바꾼다", () => {
    const s = toOutletStats({
      outletId: "hani",
      articleCount: 1,
      clusterCount: 1,
      soloCount: 0,
      firstMoverCount: 0,
      firstDate: new Date("2026-06-29T00:00:00Z"),
      lastDate: new Date("2026-08-26T00:00:00Z"),
    });
    expect(s.firstDate).toBe("2026-06-29");
    expect(s.lastDate).toBe("2026-08-26");
  });

  it("기사가 없으면 날짜가 null이다", () => {
    const s = toOutletStats({
      outletId: "sisain",
      articleCount: 0,
      clusterCount: 0,
      soloCount: 0,
      firstMoverCount: 0,
      firstDate: null,
      lastDate: null,
    });
    expect(s.firstDate).toBeNull();
  });
});

describe("buildOutletSummary", () => {
  it("수집 기간·건수·단독 보도·최초 보도·겹치는 매체를 한 문단으로 적는다", () => {
    const s = buildOutletSummary(profile());
    expect(s).toContain("2026년 6월 29일부터 2026년 8월 26일까지 기사 1,407건을 수집했고");
    expect(s).toContain("1,297개 이슈에 등장했습니다");
    expect(s).toContain("775개(59.8%)는 다른 매체에서 확인되지 않은 단독 보도");
    expect(s).toContain("807개 이슈에서는 가장 먼저 보도했습니다");
    expect(s).toContain("연합뉴스(302건)·뉴시스(260건)·조선일보(249건)입니다");
  });

  it("겹치는 매체는 3곳까지만 적는다", () => {
    expect(buildOutletSummary(profile())).not.toContain("세계일보");
  });

  it("기사가 없으면 수집 중단을 알린다", () => {
    const s = buildOutletSummary(
      profile({
        stats: stats({ articleCount: 0, clusterCount: 0, firstDate: null, lastDate: null }),
        overlaps: [],
      })
    );
    expect(s).toContain("현재 수집된 기사가 없습니다");
  });

  it("겹치는 매체가 없으면 그 문장을 만들지 않는다", () => {
    expect(buildOutletSummary(profile({ overlaps: [] }))).not.toContain("함께 다룬 곳은");
  });

  it("언론사 이름 뒤에 은/는을 붙이지 않는다 — 받침에 따라 조사가 갈린다", () => {
    const s = buildOutletSummary(profile());
    expect(s).not.toMatch(/(한겨레신문은|한겨레신문는)/);
  });
});

describe("sortOutletsByVolume", () => {
  it("기사 수 내림차순으로 정렬한다", () => {
    const sorted = sortOutletsByVolume([
      stats({ outletId: "sbs", articleCount: 117 }),
      stats({ outletId: "hani", articleCount: 1407 }),
      stats({ outletId: "sisain", articleCount: 0 }),
    ]);
    expect(sorted.map((s) => s.outletId)).toEqual(["hani", "sbs", "sisain"]);
  });

  it("동률이면 OUTLETS 순서로 결정적", () => {
    const sorted = sortOutletsByVolume([
      stats({ outletId: "hani", articleCount: 10 }),
      stats({ outletId: "chosun", articleCount: 10 }),
    ]);
    // OUTLETS 배열에서 chosun이 hani보다 앞이다
    expect(sorted.map((s) => s.outletId)).toEqual(["chosun", "hani"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toOutletProfile — 언론사 페이지의 DTO 경계. 여기도 6시간 캐시를 통과한다.
// ─────────────────────────────────────────────────────────────────────────────

const statsRow = (over: Partial<Parameters<typeof toOutletProfile>[0]["stats"]> = {}) => ({
  outletId: "hani",
  articleCount: 1407,
  clusterCount: 1297,
  soloCount: 775,
  firstMoverCount: 807,
  firstDate: new Date("2026-06-29T00:00:00.000Z"),
  lastDate: new Date("2026-08-26T00:00:00.000Z"),
  ...over,
});

describe("toOutletProfile", () => {
  it("명단에 없는 언론사면 null — 페이지가 404로 떨어져야 한다", () => {
    expect(
      toOutletProfile({
        stats: statsRow({ outletId: "ghost-media" }),
        overlaps: [],
        daily: [],
        recentClusters: [],
      })
    ).toBeNull();
  });

  it("Date를 전부 YYYY-MM-DD 문자열로 바꾼다", () => {
    const profile = toOutletProfile({
      stats: statsRow(),
      overlaps: [],
      daily: [{ bucketDate: new Date("2026-08-26T00:00:00.000Z"), count: 12 }],
      recentClusters: [
        {
          id: "cl-1",
          representativeTitle: "국회 본회의 통과",
          bucketDate: new Date("2026-08-25T00:00:00.000Z"),
          articleCount: 5,
        },
      ],
    })!;

    expect(profile.stats.firstDate).toBe("2026-06-29");
    expect(profile.daily[0]).toEqual({ date: "2026-08-26", count: 12 });
    expect(profile.recentClusters[0]).toEqual({
      id: "cl-1",
      title: "국회 본회의 통과",
      bucketDate: "2026-08-25",
      articleCount: 5,
    });
    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });

  it("명단에서 빠진 언론사와의 겹침은 버린다 — 이름을 찾을 수 없어 화면에 undefined가 뜬다", () => {
    const profile = toOutletProfile({
      stats: statsRow(),
      overlaps: [
        { outletId: "yonhap", sharedClusters: 302 },
        { outletId: "retired-media", sharedClusters: 280 },
        { outletId: "chosun", sharedClusters: 249 },
      ],
      daily: [],
      recentClusters: [],
    })!;

    expect(profile.overlaps.map((o) => o.outletId)).toEqual(["yonhap", "chosun"]);
    expect(buildOutletSummary(profile)).not.toContain("undefined");
  });

  it("outlet 메타를 명단에서 채운다", () => {
    const profile = toOutletProfile({
      stats: statsRow({ outletId: "chosun" }),
      overlaps: [],
      daily: [],
      recentClusters: [],
    })!;
    expect(profile.outlet).toBe(OUTLET_MAP.chosun);
  });

  it("기사가 없는 매체도 프로필을 만든다 (페이지는 열되 색인만 뺀다)", () => {
    const profile = toOutletProfile({
      stats: statsRow({
        outletId: "sisain",
        articleCount: 0,
        clusterCount: 0,
        soloCount: 0,
        firstMoverCount: 0,
        firstDate: null,
        lastDate: null,
      }),
      overlaps: [],
      daily: [],
      recentClusters: [],
    })!;

    expect(profile).not.toBeNull();
    expect(profile.stats.articleCount).toBe(0);
    expect(profile.stats.firstDate).toBeNull();
    expect(buildOutletSummary(profile)).toContain("현재 수집된 기사가 없습니다");
  });
});

describe("buildOutletSummary — 경계", () => {
  it("클러스터가 0이면 단독 보도 문장을 만들지 않는다 — 0으로 나누지 않는다", () => {
    const s = buildOutletSummary(
      profile({ stats: stats({ articleCount: 5, clusterCount: 0, soloCount: 0 }) })
    );
    expect(s).not.toContain("단독 보도");
    expect(s).not.toContain("NaN");
  });

  it("모든 이슈가 단독이면 100%로 적는다", () => {
    const s = buildOutletSummary(
      profile({ stats: stats({ clusterCount: 10, soloCount: 10, firstMoverCount: 10 }) })
    );
    expect(s).toContain("10개(100%)");
  });

  it("어떤 조합에서도 NaN이나 undefined가 새어 나가지 않는다", () => {
    const cases = [
      profile(),
      profile({ overlaps: [] }),
      profile({ stats: stats({ clusterCount: 0, soloCount: 0, firstMoverCount: 0 }) }),
      profile({ stats: stats({ articleCount: 0, firstDate: null, lastDate: null }) }),
      profile({ stats: stats({ firstDate: "2026-08-26", lastDate: "2026-08-26" }) }),
    ];
    for (const p of cases) {
      const s = buildOutletSummary(p);
      expect(s).not.toMatch(/NaN|undefined|null/);
      expect(s.endsWith(".")).toBe(true);
    }
  });
});
