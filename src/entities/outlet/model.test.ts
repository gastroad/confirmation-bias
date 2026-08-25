import { describe, it, expect } from "vitest";
import {
  emptyDistribution,
  calcLeaningGroupRatios,
  calcTilt,
  tiltSide,
  TILT_BALANCE_THRESHOLD,
  OUTLETS,
  OUTLET_MAP,
} from "./model";

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

describe("calcTilt", () => {
  it("진보와 보수가 같으면 0이다", () => {
    const dist = { ...emptyDistribution(), left: 3, center: 4, right: 3 };
    expect(calcTilt(calcLeaningGroupRatios(dist))).toBeCloseTo(0);
  });

  it("진보가 많으면 양수, 보수가 많으면 음수다", () => {
    const prog = { ...emptyDistribution(), left: 7, right: 3 };
    const cons = { ...emptyDistribution(), left: 3, right: 7 };
    expect(calcTilt(calcLeaningGroupRatios(prog))).toBeCloseTo(40);
    expect(calcTilt(calcLeaningGroupRatios(cons))).toBeCloseTo(-40);
  });

  it("중도만 있으면 0이다 (중도는 어느 쪽으로도 기울지 않는다)", () => {
    const dist = { ...emptyDistribution(), center: 9 };
    expect(calcTilt(calcLeaningGroupRatios(dist))).toBeCloseTo(0);
  });

  it("기사가 없으면 0이다", () => {
    expect(calcTilt(calcLeaningGroupRatios(emptyDistribution()))).toBe(0);
  });
});

describe("tiltSide", () => {
  it("임계값 미만이면 균형이다", () => {
    expect(tiltSide(0)).toBe("balanced");
    expect(tiltSide(TILT_BALANCE_THRESHOLD - 0.1)).toBe("balanced");
    expect(tiltSide(-(TILT_BALANCE_THRESHOLD - 0.1))).toBe("balanced");
  });

  it("임계값 이상이면 기운 쪽을 돌려준다", () => {
    expect(tiltSide(TILT_BALANCE_THRESHOLD)).toBe("progressive");
    expect(tiltSide(-TILT_BALANCE_THRESHOLD)).toBe("conservative");
    expect(tiltSide(40)).toBe("progressive");
    expect(tiltSide(-40)).toBe("conservative");
  });
});
