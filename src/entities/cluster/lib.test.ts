import { describe, it, expect } from "vitest";
import { emptyDistribution, GROUP_BY_LEANING, LEANING_GROUPS } from "@/entities/outlet";
import type { LeaningDistribution } from "@/entities/outlet";
import {
  countLeaningGroups,
  isIndexableCluster,
  INDEX_CRITERIA,
  partitionBySpread,
  selectMostSplit,
  selectMostShared,
} from "./lib";
import type { ClusterSummary } from "./model";
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

function cluster(over: Partial<ClusterSummary> & { id: string }): ClusterSummary {
  return {
    representativeTitle: `이슈 ${over.id}`,
    summary: null,
    bucketDate: "2026-08-26",
    articleCount: 5,
    outletCount: 5,
    latestPublishedAt: "2026-08-26T00:00:00.000Z",
    leaningDistribution: dist({ left: 3, right: 2 }),
    leaningGroupRatios: { progressive: 0.6, neutral: 0, conservative: 0.4 },
    tilt: 20,
    ...over,
  };
}

describe("partitionBySpread", () => {
  it("언론사 2곳 이상이면 본 목록, 1곳이면 단독으로 가른다", () => {
    const { covered, solo } = partitionBySpread([
      cluster({ id: "a", outletCount: 3 }),
      cluster({ id: "b", outletCount: 1 }),
      cluster({ id: "c", outletCount: 2 }),
    ]);
    expect(covered.map((c) => c.id)).toEqual(["a", "c"]);
    expect(solo.map((c) => c.id)).toEqual(["b"]);
  });

  it("입력 순서를 유지한다 — 서버 정렬을 뒤집지 않는다", () => {
    const { covered } = partitionBySpread([
      cluster({ id: "1", outletCount: 9 }),
      cluster({ id: "2", outletCount: 4 }),
    ]);
    expect(covered.map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("빈 목록도 안전하다", () => {
    expect(partitionBySpread([])).toEqual({ covered: [], solo: [] });
  });
});

describe("selectMostSplit", () => {
  const pool = [
    cluster({ id: "tiny", articleCount: 4, tilt: 75 }),
    cluster({ id: "big", articleCount: 9, tilt: 56 }),
    cluster({ id: "mid", articleCount: 7, tilt: 57 }),
    cluster({ id: "balanced", articleCount: 20, tilt: 2 }),
  ];

  it("기사 수 하한에 못 미치면 편중이 커도 뺀다 — ±75%p는 표본이 작아 나온 값이다", () => {
    const out = selectMostSplit(pool, { minArticles: 6, limit: 10 });
    expect(out.map((c) => c.id)).not.toContain("tiny");
  });

  it("균형 범위 안이면 뺀다", () => {
    const out = selectMostSplit(pool, { minArticles: 6, limit: 10 });
    expect(out.map((c) => c.id)).not.toContain("balanced");
  });

  it("편중 절댓값 내림차순, 동률이면 보도량 순", () => {
    const out = selectMostSplit(
      [
        cluster({ id: "a", articleCount: 6, tilt: -40 }),
        cluster({ id: "b", articleCount: 9, tilt: 40 }),
        cluster({ id: "c", articleCount: 6, tilt: 60 }),
      ],
      { minArticles: 6, limit: 10 }
    );
    expect(out.map((c) => c.id)).toEqual(["c", "b", "a"]);
  });

  it("음수 편중(보수 우세)도 같은 크기로 다룬다", () => {
    const out = selectMostSplit([cluster({ id: "cons", articleCount: 8, tilt: -70 })], {
      minArticles: 6,
      limit: 10,
    });
    expect(out.map((c) => c.id)).toEqual(["cons"]);
  });

  it("limit만큼만 자른다", () => {
    expect(selectMostSplit(pool, { minArticles: 1, limit: 2 })).toHaveLength(2);
  });

  it("입력 배열을 건드리지 않는다", () => {
    const input = [...pool];
    selectMostSplit(input, { minArticles: 1, limit: 10 });
    expect(input.map((c) => c.id)).toEqual(pool.map((c) => c.id));
  });
});

describe("selectMostShared", () => {
  it("세 진영이 모두 등장한 이슈만 고른다", () => {
    const out = selectMostShared(
      [
        cluster({ id: "three", leaningDistribution: dist({ left: 2, center: 1, right: 2 }) }),
        cluster({ id: "two", leaningDistribution: dist({ left: 2, right: 2 }) }),
      ],
      10
    );
    expect(out.map((c) => c.id)).toEqual(["three"]);
  });

  it("보도량 내림차순, 동률이면 균형에 가까운 순", () => {
    const three = dist({ left: 2, center: 1, right: 2 });
    const out = selectMostShared(
      [
        cluster({ id: "a", articleCount: 10, tilt: 30, leaningDistribution: three }),
        cluster({ id: "b", articleCount: 20, tilt: 5, leaningDistribution: three }),
        cluster({ id: "c", articleCount: 10, tilt: 5, leaningDistribution: three }),
      ],
      10
    );
    expect(out.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
});
