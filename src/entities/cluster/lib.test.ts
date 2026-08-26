import { describe, it, expect } from "vitest";
import { emptyDistribution, GROUP_BY_LEANING, LEANING_GROUPS } from "@/entities/outlet";
import type { LeaningDistribution } from "@/entities/outlet";
import { countLeaningGroups, isIndexableCluster, INDEX_CRITERIA } from "./lib";
import { INDEX_MIN_ARTICLES, INDEX_MIN_LEANING_GROUPS } from "./model";

function dist(partial: Partial<LeaningDistribution>): LeaningDistribution {
  return { ...emptyDistribution(), ...partial };
}

describe("countLeaningGroups", () => {
  it("기사가 없으면 0", () => {
    expect(countLeaningGroups(emptyDistribution())).toBe(0);
  });

  it("같은 그룹의 여러 성향은 한 그룹으로 센다", () => {
    expect(countLeaningGroups(dist({ left: 3, center_left: 2 }))).toBe(1);
  });

  it("진보·중도·보수가 모두 등장하면 3", () => {
    expect(countLeaningGroups(dist({ left: 1, center: 1, right: 1 }))).toBe(3);
  });

  it("unknown은 어느 그룹도 아니므로 세지 않는다", () => {
    expect(countLeaningGroups(dist({ unknown: 5 }))).toBe(0);
    expect(countLeaningGroups(dist({ unknown: 5, left: 1 }))).toBe(1);
  });
});

describe("isIndexableCluster", () => {
  it("기사 수가 모자라면 성향이 갈려도 제외한다", () => {
    expect(
      isIndexableCluster({
        articleCount: INDEX_MIN_ARTICLES - 1,
        leaningDistribution: dist({ left: 1, right: 1 }),
      })
    ).toBe(false);
  });

  it("한 진영만 등장하면 기사가 많아도 제외한다 — 비교가 성립하지 않는다", () => {
    expect(
      isIndexableCluster({
        articleCount: 12,
        leaningDistribution: dist({ left: 8, center_left: 4 }),
      })
    ).toBe(false);
  });

  it("기사 3건 이상 + 두 진영 이상이면 색인한다", () => {
    expect(
      isIndexableCluster({
        articleCount: INDEX_MIN_ARTICLES,
        leaningDistribution: dist({ left: 2, right: 1 }),
      })
    ).toBe(true);
  });

  it("unknown 언론사만으로는 진영 수를 채우지 못한다", () => {
    expect(
      isIndexableCluster({ articleCount: 9, leaningDistribution: dist({ left: 8, unknown: 1 }) })
    ).toBe(false);
  });
});

describe("INDEX_CRITERIA", () => {
  // server/queries/clusters.ts의 raw SQL은 이 객체를 그대로 받아 같은 판정을 한다.
  // 여기가 도메인 상수와 어긋나면 sitemap과 상세 페이지의 색인 판정이 갈린다.
  it("도메인 상수를 그대로 싣는다", () => {
    expect(INDEX_CRITERIA.minArticles).toBe(INDEX_MIN_ARTICLES);
    expect(INDEX_CRITERIA.minLeaningGroups).toBe(INDEX_MIN_LEANING_GROUPS);
  });

  it("groupByLeaning이 LEANING_GROUPS를 빠짐없이 뒤집은 것이다", () => {
    const expected = Object.entries(LEANING_GROUPS).flatMap(([group, leanings]) =>
      leanings.map((l) => [l, group])
    );
    expect(Object.entries(INDEX_CRITERIA.groupByLeaning).sort()).toEqual(expected.sort());
    expect(GROUP_BY_LEANING.unknown).toBeUndefined();
  });
});
