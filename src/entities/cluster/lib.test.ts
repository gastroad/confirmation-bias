import { describe, it, expect } from "vitest";
import {
  emptyDistribution,
  GROUP_BY_LEANING,
  LEANING_GROUPS,
  OUTLET_MAP,
} from "@/entities/outlet/@x/cluster";
import type { LeaningDistribution } from "@/entities/outlet/@x/cluster";
import {
  countLeaningGroups,
  isIndexableCluster,
  INDEX_CRITERIA,
  partitionBySpread,
  selectMostSplit,
  selectMostShared,
  toClusterSummary,
  toClusterDetail,
  toDaySummary,
  toClusterStats,
  groupArticlesByLeaning,
  calcLagGeometry,
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

// ─────────────────────────────────────────────────────────────────────────────
// DTO 매핑 — `unstable_cache`가 JSON 직렬화하는 경계다.
//
// Prisma row(Date 객체)를 그대로 캐시하면 문자열로 돌아와 `publishedAt.getTime()`이 깨진다.
// 그래서 캐시는 **여기를 통과한 뒤에** 건다. 2026-08-25에 DTO에 필드를 추가하고 DTO_VERSION을
// 올리지 않아 프로덕션에 NaN이 떴다 — 그 경계가 정확히 이 함수들이다.
// → docs/agent/caching.md, server/cache.ts
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET = new Date("2026-08-26T00:00:00.000Z"); // @db.Date는 UTC 자정으로 온다
const CREATED = new Date("2026-08-27T01:23:45.000Z");

const summaryRow = (
  articles: { outletId: string; publishedAt: string }[],
  over: Partial<{ id: string; representativeTitle: string; summary: string | null }> = {}
) => ({
  id: "c1",
  representativeTitle: "대표 제목",
  summary: null,
  bucketDate: BUCKET,
  createdAt: CREATED,
  articles: articles.map((a) => ({ outletId: a.outletId, publishedAt: new Date(a.publishedAt) })),
  ...over,
});

describe("toClusterSummary", () => {
  it("Date를 전부 문자열로 바꾼다 — 캐시를 통과해도 살아남는 형태", () => {
    const dto = toClusterSummary(
      summaryRow([{ outletId: "hani", publishedAt: "2026-08-26T05:00:00.000Z" }])
    );
    expect(dto.bucketDate).toBe("2026-08-26");
    expect(dto.latestPublishedAt).toBe("2026-08-26T05:00:00.000Z");
    // JSON 왕복(=unstable_cache가 하는 일)에도 값이 그대로여야 한다
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });

  it("성향 분포를 언론사 명단으로 센다", () => {
    const dto = toClusterSummary(
      summaryRow([
        { outletId: "hani", publishedAt: "2026-08-26T01:00:00Z" },
        { outletId: "khan", publishedAt: "2026-08-26T02:00:00Z" },
        { outletId: "chosun", publishedAt: "2026-08-26T03:00:00Z" },
      ])
    );
    expect(dto.leaningDistribution).toEqual(dist({ left: 1, center_left: 1, right: 1 }));
    expect(dto.articleCount).toBe(3);
  });

  it("명단에 없는 언론사는 unknown으로 떨어진다 — 진영 수를 부풀리지 않는다", () => {
    const dto = toClusterSummary(
      summaryRow([{ outletId: "ghost-media", publishedAt: "2026-08-26T01:00:00Z" }])
    );
    expect(dto.leaningDistribution.unknown).toBe(1);
    expect(countLeaningGroups(dto.leaningDistribution)).toBe(0);
    expect(isIndexableCluster(dto)).toBe(false);
  });

  it("같은 매체가 여러 건 써도 outletCount는 하나로 센다", () => {
    const dto = toClusterSummary(
      summaryRow([
        { outletId: "hani", publishedAt: "2026-08-26T01:00:00Z" },
        { outletId: "hani", publishedAt: "2026-08-26T02:00:00Z" },
        { outletId: "chosun", publishedAt: "2026-08-26T03:00:00Z" },
      ])
    );
    expect(dto.articleCount).toBe(3);
    expect(dto.outletCount).toBe(2);
  });

  it("latestPublishedAt은 가장 늦은 기사다 (배열 순서에 의존하지 않는다)", () => {
    const dto = toClusterSummary(
      summaryRow([
        { outletId: "hani", publishedAt: "2026-08-26T09:00:00.000Z" },
        { outletId: "khan", publishedAt: "2026-08-26T03:00:00.000Z" },
        { outletId: "chosun", publishedAt: "2026-08-26T07:00:00.000Z" },
      ])
    );
    expect(dto.latestPublishedAt).toBe("2026-08-26T09:00:00.000Z");
  });

  it("기사가 없으면 createdAt으로 폴백한다 — 화면에 Invalid Date를 띄우지 않는다", () => {
    const dto = toClusterSummary(summaryRow([]));
    expect(dto.latestPublishedAt).toBe(CREATED.toISOString());
    expect(dto.articleCount).toBe(0);
    expect(dto.tilt).toBe(0);
  });

  it("tilt가 분포와 일관된다", () => {
    const dto = toClusterSummary(
      summaryRow([
        { outletId: "hani", publishedAt: "2026-08-26T01:00:00Z" },
        { outletId: "khan", publishedAt: "2026-08-26T01:00:00Z" },
        { outletId: "chosun", publishedAt: "2026-08-26T01:00:00Z" },
        { outletId: "yonhap", publishedAt: "2026-08-26T01:00:00Z" },
      ])
    );
    // 진보 50% − 보수 25% = +25%p
    expect(dto.tilt).toBeCloseTo(25);
    expect(dto.leaningGroupRatios.neutral).toBeCloseTo(0.25);
  });

  it("summary는 null도 그대로 싣는다 (요약 백필 전 클러스터)", () => {
    expect(toClusterSummary(summaryRow([], { summary: null })).summary).toBeNull();
    expect(toClusterSummary(summaryRow([], { summary: "한 문장." })).summary).toBe("한 문장.");
  });

  it("KST 기준일이 UTC 날짜로 밀리지 않는다", () => {
    // @db.Date는 UTC 자정으로 오므로 날짜 부분만 떼면 그대로 KST 기준일이다.
    const dto = toClusterSummary({
      ...summaryRow([]),
      bucketDate: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(dto.bucketDate).toBe("2026-01-01");
  });
});

const detailArticle = (
  over: Partial<{
    id: string;
    title: string;
    url: string;
    publishedAt: string;
    outletId: string;
    outlet: { name: string; domain: string; leaning: string };
  }> = {}
) => ({
  id: "a1",
  title: "기사 제목",
  url: "https://example.com/a1",
  publishedAt: "2026-08-26T01:00:00.000Z",
  outletId: "hani",
  outlet: { name: "한겨레신문", domain: "hani.co.kr", leaning: "left" },
  ...over,
});

const detailRow = (articles: ReturnType<typeof detailArticle>[]) => ({
  id: "c1",
  representativeTitle: "대표 제목",
  summary: "요약 문장.",
  bucketDate: BUCKET,
  createdAt: CREATED,
  articles: articles.map((a) => ({ ...a, publishedAt: new Date(a.publishedAt) })),
});

describe("toClusterDetail", () => {
  it("요약 DTO와 같은 집계값을 낸다 — 목록과 상세의 수치가 갈리면 안 된다", () => {
    const articles = [
      detailArticle({ id: "a1", outletId: "hani" }),
      detailArticle({ id: "a2", outletId: "chosun", publishedAt: "2026-08-26T04:00:00.000Z" }),
    ];
    const detail = toClusterDetail(detailRow(articles));
    const summary = toClusterSummary({
      ...summaryRow(
        articles.map((a) => ({ outletId: a.outletId, publishedAt: a.publishedAt })),
        { summary: "요약 문장." }
      ),
    });

    expect(detail.articleCount).toBe(summary.articleCount);
    expect(detail.outletCount).toBe(summary.outletCount);
    expect(detail.leaningDistribution).toEqual(summary.leaningDistribution);
    expect(detail.tilt).toBeCloseTo(summary.tilt);
    expect(detail.latestPublishedAt).toBe(summary.latestPublishedAt);
  });

  it("기사의 언론사 메타를 OUTLET_MAP에서 채운다", () => {
    const [a] = toClusterDetail(detailRow([detailArticle({ outletId: "chosun" })])).articles;
    expect(a.outlet.id).toBe("chosun");
    expect(a.outlet.name).toBe("조선일보");
    expect(a.outlet.leaningLabel).toBe("보수");
  });

  it("명단에 없는 언론사는 DB row의 값으로 폴백한다 — 기사를 떨어뜨리지 않는다", () => {
    const detail = toClusterDetail(
      detailRow([
        detailArticle({
          outletId: "newcomer",
          outlet: { name: "새언론", domain: "new.co.kr", leaning: "center" },
        }),
      ])
    );
    expect(detail.articles[0].outlet).toEqual({
      id: "newcomer",
      name: "새언론",
      domain: "new.co.kr",
      leaning: "center",
      leaningLabel: "center",
    });
    // 다만 분포는 명단 기준이라 unknown이다 — 성향을 DB가 아니라 우리가 정한다.
    expect(detail.leaningDistribution.unknown).toBe(1);
    expect(detail.leaningDistribution.center).toBe(0);
  });

  it("JSON 왕복에도 값이 보존된다 (상세는 6시간 캐시된다)", () => {
    const dto = toClusterDetail(detailRow([detailArticle()]));
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});

describe("toDaySummary", () => {
  it("@db.Date를 YYYY-MM-DD로 바꾼다", () => {
    expect(toDaySummary({ bucketDate: BUCKET, clusterCount: 12, articleCount: 340 })).toEqual({
      date: "2026-08-26",
      clusterCount: 12,
      articleCount: 340,
    });
  });
});

describe("toClusterStats", () => {
  it("언론사별 건수를 성향 분포로 합친다", () => {
    const stats = toClusterStats({
      clusterCount: 10,
      articleCount: 30,
      outletCounts: [
        { outletId: "hani", count: 5 },
        { outletId: "ohmynews", count: 3 },
        { outletId: "chosun", count: 8 },
      ],
    });
    expect(stats.leaningDistribution.left).toBe(8);
    expect(stats.leaningDistribution.right).toBe(8);
    expect(stats.clusterCount).toBe(10);
  });

  it("가장 많이 보도한 성향을 고른다", () => {
    const stats = toClusterStats({
      clusterCount: 1,
      articleCount: 9,
      outletCounts: [
        { outletId: "hani", count: 2 },
        { outletId: "chosun", count: 7 },
      ],
    });
    expect(stats.dominantLeaning).toBe("right");
  });

  it("unknown이 가장 많아도 dominantLeaning이 되지 않는다 — 성향이 아니다", () => {
    const stats = toClusterStats({
      clusterCount: 1,
      articleCount: 100,
      outletCounts: [
        { outletId: "ghost", count: 99 },
        { outletId: "hani", count: 1 },
      ],
    });
    expect(stats.leaningDistribution.unknown).toBe(99);
    expect(stats.dominantLeaning).toBe("left");
  });

  it("집계가 비면 dominantLeaning이 null이다", () => {
    const stats = toClusterStats({ clusterCount: 0, articleCount: 0, outletCounts: [] });
    expect(stats.dominantLeaning).toBeNull();
    expect(stats.leaningDistribution).toEqual(emptyDistribution());
  });

  it("unknown만 있으면 dominantLeaning이 null이다", () => {
    const stats = toClusterStats({
      clusterCount: 1,
      articleCount: 4,
      outletCounts: [{ outletId: "ghost", count: 4 }],
    });
    expect(stats.dominantLeaning).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// groupArticlesByLeaning — 상세 페이지의 "같은 사건, 세 갈래 제목"
// ─────────────────────────────────────────────────────────────────────────────

const outletOf = (id: string) =>
  OUTLET_MAP[id] ?? {
    id,
    name: id,
    domain: `${id}.com`,
    leaning: "unknown" as const,
    leaningLabel: "미분류",
  };

let articleSeq = 0;
const art = (outletId: string, publishedAt: string, title = `기사 ${++articleSeq}`) => ({
  id: `a-${articleSeq}`,
  title,
  url: `https://example.com/${articleSeq}`,
  publishedAt,
  outlet: outletOf(outletId),
});

describe("groupArticlesByLeaning", () => {
  it("진보 → 중도 → 보수 순으로 세 열을 낸다 (막대의 좌우 스펙트럼과 같은 순서)", () => {
    const columns = groupArticlesByLeaning([]);
    expect(columns.map((c) => c.group)).toEqual(["progressive", "neutral", "conservative"]);
  });

  it("보도하지 않은 진영도 빈 열로 남긴다 — 침묵이 이 서비스가 보여주려는 것이다", () => {
    const columns = groupArticlesByLeaning([art("hani", "2026-08-26T01:00:00.000Z")]);
    expect(columns).toHaveLength(3);
    expect(columns[1].articles).toEqual([]);
    expect(columns[1].outletCount).toBe(0);
  });

  it("기사를 진영별 열에 나눠 담는다", () => {
    const columns = groupArticlesByLeaning([
      art("chosun", "2026-08-26T04:00:00.000Z", "보수"),
      art("hani", "2026-08-26T01:00:00.000Z", "진보"),
      art("yonhap", "2026-08-26T02:00:00.000Z", "중도"),
    ]);
    expect(columns[0].articles.map((a) => a.title)).toEqual(["진보"]);
    expect(columns[1].articles.map((a) => a.title)).toEqual(["중도"]);
    expect(columns[2].articles.map((a) => a.title)).toEqual(["보수"]);
  });

  it("중도진보·중도보수도 각각 진보·보수 열로 간다", () => {
    const columns = groupArticlesByLeaning([
      art("khan", "2026-08-26T01:00:00.000Z", "중도진보"), // center_left
      art("donga", "2026-08-26T02:00:00.000Z", "중도보수"), // center_right
    ]);
    expect(columns[0].articles.map((a) => a.title)).toEqual(["중도진보"]);
    expect(columns[2].articles.map((a) => a.title)).toEqual(["중도보수"]);
    expect(columns[1].articles).toEqual([]);
  });

  it("열 안에서 보도 시각 오름차순이다 — 누가 먼저 썼는지 읽혀야 한다", () => {
    const columns = groupArticlesByLeaning([
      art("hani", "2026-08-26T09:00:00.000Z", "나중"),
      art("khan", "2026-08-26T01:00:00.000Z", "먼저"),
      art("ohmynews", "2026-08-26T05:00:00.000Z", "가운데"),
    ]);
    expect(columns[0].articles.map((a) => a.title)).toEqual(["먼저", "가운데", "나중"]);
  });

  it("같은 매체의 여러 건은 언론사 수로 하나만 센다", () => {
    const columns = groupArticlesByLeaning([
      art("hani", "2026-08-26T01:00:00.000Z"),
      art("hani", "2026-08-26T02:00:00.000Z"),
      art("khan", "2026-08-26T03:00:00.000Z"),
    ]);
    expect(columns[0].articles).toHaveLength(3);
    expect(columns[0].outletCount).toBe(2);
  });

  it("명단에 없는 매체(unknown)는 어느 열에도 넣지 않는다", () => {
    const columns = groupArticlesByLeaning([
      art("hani", "2026-08-26T01:00:00.000Z", "진보"),
      art("ghost-media", "2026-08-26T02:00:00.000Z", "미분류"),
    ]);
    expect(columns.flatMap((c) => c.articles.map((a) => a.title))).toEqual(["진보"]);
  });

  it("입력 배열을 건드리지 않는다", () => {
    const input = [
      art("hani", "2026-08-26T09:00:00.000Z", "나중"),
      art("khan", "2026-08-26T01:00:00.000Z", "먼저"),
    ];
    const before = input.map((a) => a.title);
    groupArticlesByLeaning(input);
    expect(input.map((a) => a.title)).toEqual(before);
  });

  it("어느 열에도 중복 배정되지 않는다", () => {
    const articles = [
      art("hani", "2026-08-26T01:00:00.000Z"),
      art("yonhap", "2026-08-26T02:00:00.000Z"),
      art("chosun", "2026-08-26T03:00:00.000Z"),
    ];
    const ids = groupArticlesByLeaning(articles).flatMap((c) => c.articles.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcLagGeometry — 상세 페이지의 "보도 시차" 스트립
// ─────────────────────────────────────────────────────────────────────────────

describe("calcLagGeometry", () => {
  it("진보 → 중도 → 보수 순으로 세 레인을 낸다 (막대의 좌우 스펙트럼과 같은 순서)", () => {
    expect(calcLagGeometry([]).lanes.map((l) => l.group)).toEqual([
      "progressive",
      "neutral",
      "conservative",
    ]);
  });

  it("점의 가로 위치는 KST 자정으로부터의 분이다", () => {
    // UTC 02:36 = KST 11:36 = 696분. 696 / 1440 = 48.33%
    const { lanes } = calcLagGeometry([art("donga", "2026-08-30T02:36:00.000Z")]);
    const [dot] = lanes.find((l) => l.group === "conservative")!.dots;
    expect(dot.time).toBe("11:36");
    expect(dot.left).toBeCloseTo(48.333, 3);
  });

  it("KST 하루의 양 끝이 0%와 100% 안에 들어온다", () => {
    const { lanes } = calcLagGeometry([
      art("hani", "2026-08-29T15:00:00.000Z"), // KST 08-30 00:00
      art("khan", "2026-08-30T14:59:00.000Z"), // KST 08-30 23:59
    ]);
    const dots = lanes.find((l) => l.group === "progressive")!.dots;
    expect(dots.map((d) => d.time)).toEqual(["00:00", "23:59"]);
    expect(dots[0].left).toBe(0);
    expect(dots[1].left).toBeCloseTo(99.93, 2);
  });

  /**
   * 서버 컴포넌트가 그리는 값이라 Vercel(UTC)에서 계산된다. 환경 타임존을 따르면
   * 아래 세 열의 기사 시각(KST 고정)과 점의 위치가 어긋난다.
   */
  it("실행 환경 타임존과 무관하게 같은 좌표를 낸다", () => {
    const tz = process.env.TZ;
    const results = ["UTC", "Asia/Seoul", "America/New_York", "Pacific/Auckland"].map((z) => {
      process.env.TZ = z;
      return calcLagGeometry([art("chosun", "2026-08-30T02:36:00.000Z")]).first;
    });
    process.env.TZ = tz;

    expect(new Set(results.map((r) => r!.time))).toEqual(new Set(["11:36"]));
  });

  it("최초 보도는 가장 이른 기사의 시각과 매체다", () => {
    const lag = calcLagGeometry([
      art("khan", "2026-08-30T05:00:00.000Z"),
      art("donga", "2026-08-30T02:36:00.000Z"),
      art("sbs", "2026-08-30T03:06:00.000Z"),
    ]);
    expect(lag.first).toEqual({ time: "11:36", outletName: "동아일보" });
  });

  it("최초 대비 격차를 분으로 잰다 — 먼저 쓴 진영은 0이다", () => {
    const lag = calcLagGeometry([
      art("donga", "2026-08-30T02:36:00.000Z"), // 보수 11:36
      art("khan", "2026-08-30T02:41:00.000Z"), // 진보 11:41
      art("sbs", "2026-08-30T03:06:00.000Z"), // 중도 12:06
    ]);
    const gap = Object.fromEntries(lag.lanes.map((l) => [l.group, l.gapMinutes]));
    expect(gap).toEqual({ conservative: 0, progressive: 5, neutral: 30 });
  });

  it("보도하지 않은 진영은 빈 레인으로 남긴다 — 침묵이 이 화면이 보여주려는 것이다", () => {
    const lag = calcLagGeometry([art("hani", "2026-08-30T02:00:00.000Z")]);
    const neutral = lag.lanes.find((l) => l.group === "neutral")!;
    expect(neutral.dots).toEqual([]);
    expect(neutral.firstTime).toBeNull();
    expect(neutral.gapMinutes).toBeNull();
  });

  it("ranked는 첫 보도가 이른 순이고 보도 없는 진영은 맨 뒤다", () => {
    const lag = calcLagGeometry([
      art("khan", "2026-08-30T05:48:00.000Z"), // 진보 14:48
      art("newsis", "2026-08-29T15:50:00.000Z"), // 중도 00:50
      art("segye", "2026-08-30T04:11:00.000Z"), // 보수 13:11
    ]);
    expect(lag.ranked.map((l) => l.group)).toEqual(["neutral", "conservative", "progressive"]);

    const silent = calcLagGeometry([
      art("segye", "2026-08-30T04:11:00.000Z"),
      art("khan", "2026-08-30T02:00:00.000Z"),
    ]);
    expect(silent.ranked.map((l) => l.group)).toEqual([
      "progressive",
      "conservative",
      "neutral", // 보도 없음
    ]);
  });

  it("레인 안의 점은 시각 오름차순이고 첫 점만 isFirst다", () => {
    const lag = calcLagGeometry([
      art("khan", "2026-08-30T07:20:00.000Z"),
      art("hani", "2026-08-30T02:00:00.000Z"),
      art("khan", "2026-08-30T04:31:00.000Z"),
    ]);
    const dots = lag.lanes.find((l) => l.group === "progressive")!.dots;
    expect(dots.map((d) => d.time)).toEqual(["11:00", "13:31", "16:20"]);
    expect(dots.map((d) => d.isFirst)).toEqual([true, false, false]);
  });

  it("같은 시각에 몰린 점은 흩뜨리지 않는다 — 겹침 자체가 '그 시간에 몰렸다'는 신호다", () => {
    const lag = calcLagGeometry([
      art("sbs", "2026-08-30T03:06:00.000Z"),
      art("newsis", "2026-08-30T03:06:00.000Z"),
    ]);
    const dots = lag.lanes.find((l) => l.group === "neutral")!.dots;
    expect(dots.map((d) => d.left)).toEqual([dots[0].left, dots[0].left]);
    // 동시 보도는 둘 다 그 진영의 첫 보도다.
    expect(dots.every((d) => d.isFirst)).toBe(true);
  });

  it("명단에 없는 매체는 어느 레인에도 넣지 않는다 — 진영을 모르면 시차를 말할 수 없다", () => {
    const lag = calcLagGeometry([
      art("newcomer", "2026-08-29T15:10:00.000Z"), // KST 00:10, unknown
      art("hani", "2026-08-30T02:00:00.000Z"),
    ]);
    expect(lag.lanes.flatMap((l) => l.dots)).toHaveLength(1);
    // 최초 보도도 아래 세 열과 같은 모집단에서 고른다.
    expect(lag.first).toEqual({ time: "11:00", outletName: "한겨레신문" });
  });

  it("성향을 아는 기사가 없으면 최초 보도가 없다 — 섹션 자체를 세우지 않는 조건이다", () => {
    expect(calcLagGeometry([]).first).toBeNull();
    expect(calcLagGeometry([art("newcomer", "2026-08-30T02:00:00.000Z")]).first).toBeNull();
  });
});
