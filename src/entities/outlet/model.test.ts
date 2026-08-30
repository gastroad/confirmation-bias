import { describe, it, expect } from "vitest";
import type { LeaningDistribution } from "./model";
import {
  emptyDistribution,
  calcLeaningGroupRatios,
  calcTilt,
  tiltSide,
  TILT_BALANCE_THRESHOLD,
  OUTLETS,
  OUTLET_MAP,
  OUTLETS_BY_GROUP,
  LEANING_GROUPS,
  LEANING_GROUP_ORDER,
  LEANING_LABELS,
  LEANING_ORDER,
  GROUP_BY_LEANING,
  calcBarGeometry,
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

// ─────────────────────────────────────────────────────────────────────────────
// 명단 정합성 — 여기가 어긋나면 화면이 아니라 **집계가** 조용히 틀린다.
// 새 언론사를 추가할 때(→ docs/agent/workflows.md) 빠뜨리기 쉬운 곳들이다.
// ─────────────────────────────────────────────────────────────────────────────

describe("성향 분류 정합성", () => {
  it("모든 언론사가 정확히 한 진영에 속한다", () => {
    for (const outlet of OUTLETS) {
      const groups = LEANING_GROUP_ORDER.filter((g) => LEANING_GROUPS[g].includes(outlet.leaning));
      expect(groups, `${outlet.name}(${outlet.leaning})`).toHaveLength(1);
    }
  });

  it("명단에 unknown 성향의 언론사를 두지 않는다 — unknown은 '명단에 없음'의 뜻이다", () => {
    expect(OUTLETS.filter((o) => o.leaning === "unknown")).toEqual([]);
  });

  it("OUTLETS_BY_GROUP이 OUTLETS를 빠짐없이 나눈다", () => {
    const grouped = LEANING_GROUP_ORDER.flatMap((g) => OUTLETS_BY_GROUP[g]);
    expect(grouped).toHaveLength(OUTLETS.length);
    expect(new Set(grouped.map((o) => o.id))).toEqual(new Set(OUTLETS.map((o) => o.id)));
  });

  it("세 진영이 모두 비어 있지 않다 — 한 진영이 비면 '비교'가 성립하지 않는다", () => {
    for (const group of LEANING_GROUP_ORDER) {
      expect(OUTLETS_BY_GROUP[group].length, group).toBeGreaterThan(0);
    }
  });

  it("LEANING_ORDER가 모든 성향을 한 번씩 담는다 (막대의 좌→우 순서)", () => {
    expect(LEANING_ORDER).toEqual([
      "left",
      "center_left",
      "center",
      "center_right",
      "right",
      "unknown",
    ]);
    expect(new Set(LEANING_ORDER).size).toBe(LEANING_ORDER.length);
  });

  it("emptyDistribution의 키가 LEANING_ORDER와 정확히 같다", () => {
    expect(Object.keys(emptyDistribution()).sort()).toEqual([...LEANING_ORDER].sort());
  });

  it("모든 성향에 한글 라벨이 있다", () => {
    for (const leaning of LEANING_ORDER) {
      expect(LEANING_LABELS[leaning], leaning).toBeTruthy();
    }
  });

  it("leaningLabel이 LEANING_LABELS와 어긋나지 않는다", () => {
    for (const outlet of OUTLETS) {
      expect(outlet.leaningLabel, outlet.name).toBe(LEANING_LABELS[outlet.leaning]);
    }
  });

  it("GROUP_BY_LEANING에 unknown 키가 없다 — 미분류가 한 진영처럼 잡히면 안 된다", () => {
    expect(GROUP_BY_LEANING.unknown).toBeUndefined();
    expect(Object.keys(GROUP_BY_LEANING).sort()).toEqual(
      LEANING_ORDER.filter((l) => l !== "unknown").sort()
    );
  });

  it("GROUP_BY_LEANING이 LEANING_GROUPS를 정확히 뒤집은 것이다", () => {
    for (const group of LEANING_GROUP_ORDER) {
      for (const leaning of LEANING_GROUPS[group]) {
        expect(GROUP_BY_LEANING[leaning], leaning).toBe(group);
      }
    }
  });

  it("진영 순서가 진보 → 중도 → 보수다 (화면의 좌우 스펙트럼)", () => {
    expect(LEANING_GROUP_ORDER).toEqual(["progressive", "neutral", "conservative"]);
  });
});

describe("OUTLETS 데이터 무결성", () => {
  it("도메인이 중복되지 않는다 — 기사 출처를 가릴 수 없게 된다", () => {
    const domains = OUTLETS.map((o) => o.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("이름이 중복되지 않는다", () => {
    const names = OUTLETS.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("도메인에 스킴이나 경로가 섞이지 않는다", () => {
    for (const outlet of OUTLETS) {
      expect(outlet.domain, outlet.name).not.toMatch(/^https?:\/\//);
      expect(outlet.domain, outlet.name).not.toContain("/");
      expect(outlet.domain, outlet.name).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
    }
  });

  it("id가 URL에 그대로 실려도 안전한 형태다 (?outlets=… 파라미터)", () => {
    for (const outlet of OUTLETS) {
      expect(outlet.id, outlet.name).toMatch(/^[a-z0-9_]+$/);
      expect(encodeURIComponent(outlet.id)).toBe(outlet.id);
    }
  });

  it("OUTLET_MAP이 같은 객체를 가리킨다 (복사본이 아니다)", () => {
    for (const outlet of OUTLETS) {
      expect(OUTLET_MAP[outlet.id]).toBe(outlet);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 중심선(meridian) — 이 서비스의 시각적 주장.
//
// 막대는 폭이 아니라 **위치**로 말한다. CSS를 손대면 조용히 깨지는 종류라
// (브라우저 없이는 눈에 띄지 않는다) 기하 자체를 여기서 고정한다.
//   midpoint = 진보% + 중도%/2      ← 막대 안에서 중도 중점의 위치
//   left     = 50 − midpoint × 0.5  ← 트랙 좌측에서의 시작점
// → docs/agent/architecture.md
// ─────────────────────────────────────────────────────────────────────────────

const barDist = (partial: Partial<LeaningDistribution>): LeaningDistribution => ({
  ...emptyDistribution(),
  ...partial,
});

describe("calcBarGeometry — 빈 분포", () => {
  it("기사가 없으면 null (막대 대신 빈 레일)", () => {
    expect(calcBarGeometry(emptyDistribution())).toBeNull();
  });

  it("unknown만 있어도 막대를 그린다 — 총합이 0이 아니다", () => {
    const g = calcBarGeometry(barDist({ unknown: 3 }))!;
    expect(g).not.toBeNull();
    expect(g.segments).toHaveLength(1);
  });
});

describe("calcBarGeometry — 중심선", () => {
  it("중도만 보도하면 막대 중앙이 트랙 한가운데에 온다", () => {
    // 진보 0 + 중도 100/2 = midpoint 50 → left 25% (막대 폭 50%의 절반)
    const g = calcBarGeometry(barDist({ center: 4 }))!;
    expect(g.midpoint).toBeCloseTo(50);
    expect(g.left).toBeCloseTo(25);
  });

  it("진보만 보도하면 막대 전체가 중심선 왼쪽에 놓인다", () => {
    // midpoint 100 → left 0%. 막대(폭 50%)의 오른쪽 끝이 정확히 트랙 50%에 닿는다.
    const g = calcBarGeometry(barDist({ left: 2, center_left: 1 }))!;
    expect(g.midpoint).toBeCloseTo(100);
    expect(g.left).toBeCloseTo(0);
  });

  it("보수만 보도하면 막대 전체가 중심선 오른쪽에 놓인다", () => {
    const g = calcBarGeometry(barDist({ right: 2, center_right: 1 }))!;
    expect(g.midpoint).toBeCloseTo(0);
    expect(g.left).toBeCloseTo(50);
  });

  it("진보와 보수가 같으면 중도 유무와 무관하게 중심선이 트랙 한가운데다", () => {
    for (const d of [
      barDist({ left: 3, right: 3 }),
      barDist({ left: 3, center: 10, right: 3 }),
      barDist({ center_left: 1, center: 1, center_right: 1 }),
    ]) {
      const g = calcBarGeometry(d)!;
      expect(g.midpoint).toBeCloseTo(50);
      expect(g.left).toBeCloseTo(25);
    }
  });

  it("한쪽으로 기울면 그만큼 중심선 밖으로 튀어나온다", () => {
    // 진보 75% / 보수 25% → midpoint 75 → left 12.5%
    const g = calcBarGeometry(barDist({ left: 3, right: 1 }))!;
    expect(g.midpoint).toBeCloseTo(75);
    expect(g.left).toBeCloseTo(12.5);
  });

  it("**어떤 분포에서도 중도 중점이 트랙 50%에 놓인다** (중심선의 정의)", () => {
    const cases = [
      barDist({ left: 1 }),
      barDist({ right: 1 }),
      barDist({ center: 1 }),
      barDist({ left: 5, center: 2, right: 1 }),
      barDist({ left: 1, center_left: 2, center: 3, center_right: 4, right: 5 }),
      barDist({ left: 2, unknown: 7 }),
      barDist({ unknown: 1 }),
    ];
    for (const d of cases) {
      const { left, midpoint } = calcBarGeometry(d)!;
      // 막대는 트랙 폭의 50%만 차지하므로 막대 내 비율에 0.5를 곱해야 트랙 좌표가 된다.
      expect(left + midpoint * 0.5).toBeCloseTo(50);
    }
  });

  it("막대가 트랙 밖으로 나가지 않는다 — 한쪽 100%가 최대 폭이다", () => {
    for (const d of [barDist({ left: 9 }), barDist({ right: 9 }), barDist({ center: 9 })]) {
      const { left } = calcBarGeometry(d)!;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + 50).toBeLessThanOrEqual(100);
    }
  });

  it("midpoint는 막대 중심(50)과 다르다 — transform-origin을 center로 두면 안 되는 이유", () => {
    const g = calcBarGeometry(barDist({ left: 9, right: 1 }))!;
    expect(g.midpoint).toBeCloseTo(90);
    expect(g.midpoint).not.toBeCloseTo(50);
  });

  it("unknown은 축을 기울이지 않는다 — 어느 진영도 아니다", () => {
    const g = calcBarGeometry(barDist({ left: 1, unknown: 1 }))!;
    expect(g.midpoint).toBeCloseTo(50);
    expect(g.left).toBeCloseTo(25);
  });
});

describe("calcBarGeometry — 세그먼트", () => {
  it("건수가 0인 성향은 세그먼트를 만들지 않는다", () => {
    expect(calcBarGeometry(barDist({ left: 2, right: 1 }))!.segments).toHaveLength(2);
  });

  it("세그먼트 폭의 합이 막대 전체(100%)다", () => {
    const g = calcBarGeometry(barDist({ left: 1, center_left: 2, center: 3, right: 4 }))!;
    expect(g.segments.reduce((s, x) => s + x.percent, 0)).toBeCloseTo(100);
  });

  it("진보 → 보수 순으로 놓는다 (LEANING_ORDER = 화면의 좌우 스펙트럼)", () => {
    const g = calcBarGeometry(
      barDist({ left: 1, center_left: 1, center: 1, center_right: 1, right: 1, unknown: 1 })
    )!;
    expect(g.segments.map((x) => x.leaning)).toEqual(LEANING_ORDER);
  });

  it("건수와 비율을 함께 싣는다 — 색만으로는 값을 읽을 수 없다", () => {
    const g = calcBarGeometry(barDist({ left: 3, right: 1 }))!;
    expect(g.segments).toEqual([
      { leaning: "left", count: 3, percent: 75 },
      { leaning: "right", count: 1, percent: 25 },
    ]);
  });

  it("midpoint가 진보·중도 세그먼트 폭과 일관된다", () => {
    const g = calcBarGeometry(barDist({ left: 2, center: 4, right: 2 }))!;
    const pct = (l: string) => g.segments.find((s) => s.leaning === l)?.percent ?? 0;
    expect(g.midpoint).toBeCloseTo(pct("left") + pct("center") / 2);
  });
});
