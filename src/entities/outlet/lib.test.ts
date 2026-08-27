import { describe, it, expect } from "vitest";
import { buildOutletSummary, ratioPercent, sortOutletsByVolume, toOutletStats } from "./lib";
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
