import { describe, it, expect } from "vitest";
import { emptyDistribution, calcLeaningGroupRatios, OUTLETS, OUTLET_MAP } from "./model";

describe("emptyDistribution", () => {
  it("모든 값이 0인 분포를 반환한다", () => {
    const dist = emptyDistribution();
    expect(Object.values(dist).every((v) => v === 0)).toBe(true);
  });

  it("독립적인 객체를 반환한다 (mutation 방어)", () => {
    const a = emptyDistribution();
    const b = emptyDistribution();
    a.left = 99;
    expect(b.left).toBe(0);
  });
});

describe("calcLeaningGroupRatios", () => {
  it("총합이 0이면 모두 0을 반환한다", () => {
    const ratios = calcLeaningGroupRatios(emptyDistribution());
    expect(ratios).toEqual({ conservative: 0, neutral: 0, progressive: 0 });
  });

  it("세 그룹의 합이 1.0이다", () => {
    const dist = { ...emptyDistribution(), left: 2, center: 3, right: 5 };
    const { conservative, neutral, progressive } = calcLeaningGroupRatios(dist);
    expect(conservative + neutral + progressive).toBeCloseTo(1.0);
  });

  it("보수 기사만 있으면 conservative=1, 나머지=0이다", () => {
    const dist = { ...emptyDistribution(), right: 3, center_right: 2 };
    const ratios = calcLeaningGroupRatios(dist);
    expect(ratios.conservative).toBeCloseTo(1.0);
    expect(ratios.neutral).toBe(0);
    expect(ratios.progressive).toBe(0);
  });

  it("진보 기사만 있으면 progressive=1이다", () => {
    const dist = { ...emptyDistribution(), left: 1, center_left: 4 };
    const ratios = calcLeaningGroupRatios(dist);
    expect(ratios.progressive).toBeCloseTo(1.0);
  });
});

describe("OUTLETS / OUTLET_MAP", () => {
  it("OUTLETS에 중복 id가 없다", () => {
    const ids = OUTLETS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("OUTLET_MAP 키 수가 OUTLETS 수와 같다", () => {
    expect(Object.keys(OUTLET_MAP).length).toBe(OUTLETS.length);
  });

  it("모든 OUTLET 항목에 필수 필드가 있다", () => {
    for (const outlet of OUTLETS) {
      expect(outlet.id).toBeTruthy();
      expect(outlet.name).toBeTruthy();
      expect(outlet.domain).toBeTruthy();
      expect(outlet.leaning).toBeTruthy();
    }
  });
});
