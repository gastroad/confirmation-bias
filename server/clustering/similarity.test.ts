import { describe, it, expect } from "vitest";
import { cosineSimilarity, normalizeVector, updateCentroid } from "./similarity";

describe("cosineSimilarity", () => {
  it("동일한 벡터는 1.0을 반환한다", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it("직교 벡터는 0을 반환한다", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("반대 방향 벡터는 -1.0을 반환한다", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });

  it("영벡터는 0을 반환한다 (division-by-zero 방어)", () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  it("차원이 다르면 에러를 던진다", () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow("Vector dimension mismatch");
  });
});

describe("normalizeVector", () => {
  it("단위 벡터로 정규화된다", () => {
    const normalized = normalizeVector([3, 4]);
    const norm = Math.sqrt(normalized.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1.0);
  });

  it("영벡터는 그대로 반환한다", () => {
    expect(normalizeVector([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe("updateCentroid", () => {
  it("새 벡터를 가중 평균으로 통합한다", () => {
    const centroid = [1, 0];
    const newVec = [0, 1];
    const result = updateCentroid(centroid, newVec, 1); // existingCount=1, 총 2개
    // 가중 평균 후 정규화 → [0.5, 0.5] normalized = [~0.707, ~0.707]
    expect(result[0]).toBeCloseTo(result[1], 5);
  });
});
