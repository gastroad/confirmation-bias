import { describe, it, expect } from "vitest";
import { agglomerate } from "./hac";

// 2D 단위벡터로 각도를 주면 내적 = cos(각도차)라 유사도를 정확히 통제할 수 있다.
function at(deg: number): Float32Array {
  const r = (deg * Math.PI) / 180;
  return new Float32Array([Math.cos(r), Math.sin(r)]);
}

const sorted = (groups: number[][]) =>
  groups.map((g) => [...g].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);

describe("agglomerate", () => {
  it("빈 입력은 빈 결과를 낸다", () => {
    expect(agglomerate([], { threshold: 0.8 })).toEqual([]);
  });

  it("단일 벡터는 단독 클러스터가 된다", () => {
    expect(agglomerate([at(0)], { threshold: 0.8 })).toEqual([[0]]);
  });

  it("모든 원소가 정확히 한 클러스터에 속한다", () => {
    const vectors = [0, 3, 6, 60, 63, 120].map(at);
    const groups = agglomerate(vectors, { threshold: 0.9 });
    expect(groups.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("멀리 떨어진 두 무리를 분리한다", () => {
    // 0~4°에 셋, 90~94°에 셋. 무리 안은 cos4°≈0.998, 무리 간은 cos86°≈0.07
    const vectors = [0, 2, 4, 90, 92, 94].map(at);
    expect(sorted(agglomerate(vectors, { threshold: 0.9 }))).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });

  it("threshold가 높으면 아무것도 병합하지 않는다", () => {
    const vectors = [0, 20, 40].map(at);
    expect(sorted(agglomerate(vectors, { threshold: 0.999 }))).toEqual([[0], [1], [2]]);
  });

  it("threshold가 낮으면 전부 하나로 묶인다", () => {
    const vectors = [0, 20, 40].map(at);
    expect(sorted(agglomerate(vectors, { threshold: -1 }))).toEqual([[0, 1, 2]]);
  });

  // 이 프로젝트가 average linkage를 고른 이유. single linkage였다면 0-12가 가깝다는
  // 이유만으로 24까지 끌려와 한 덩어리가 된다(증분 배정 시절의 블랙홀과 같은 기제).
  it("average linkage라 chaining이 일어나지 않는다", () => {
    const vectors = [0, 12, 24].map(at);
    // cos12°≈0.978 → 0,1 병합. 이후 {0,1} vs 2 = (cos24° + cos12°)/2 ≈ 0.946 < 0.96 에서 멈춘다.
    // single linkage라면 max(0.978, 0.914) = 0.978 이라 계속 붙었을 것.
    expect(sorted(agglomerate(vectors, { threshold: 0.96 }))).toEqual([[0, 1], [2]]);
  });

  it("maxClusterSize가 거대 클러스터를 막는다", () => {
    // 전부 1° 간격이라 threshold만으로는 하나로 뭉친다.
    const vectors = [0, 1, 2, 3, 4, 5].map(at);
    const unbounded = agglomerate(vectors, { threshold: 0.9 });
    expect(unbounded).toHaveLength(1);

    const bounded = agglomerate(vectors, { threshold: 0.9, maxClusterSize: 2 });
    expect(bounded.length).toBeGreaterThan(1);
    for (const g of bounded) expect(g.length).toBeLessThanOrEqual(2);
    expect(bounded.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("같은 입력에 같은 결과를 낸다 (결정적)", () => {
    const vectors = [0, 5, 11, 47, 52, 130].map(at);
    const a = agglomerate(vectors, { threshold: 0.95 });
    const b = agglomerate(vectors, { threshold: 0.95 });
    expect(a).toEqual(b);
  });

  it("동일 벡터가 여럿이어도 하나로 묶인다", () => {
    const v = at(30);
    const vectors = [v, new Float32Array(v), new Float32Array(v)];
    expect(sorted(agglomerate(vectors, { threshold: 0.99 }))).toEqual([[0, 1, 2]]);
  });
});
