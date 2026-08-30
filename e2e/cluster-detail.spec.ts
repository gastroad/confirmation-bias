import { test, expect } from "@playwright/test";
import {
  findIndexableCluster,
  findNonIndexableCluster,
  robotsMeta,
  jsonLdBlocks,
  type ClusterSummary,
} from "./fixtures";

/** 상세 본문의 제목. 같은 페이지에 댓글 절의 h2가 또 있어 첫 번째로 특정한다. */
const detailTitle = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { level: 2 }).first();

/** 색인 기준을 넘긴 클러스터를 열고, 없으면 스킵한다. */
async function openIndexable(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext
): Promise<ClusterSummary> {
  const cluster = await findIndexableCluster(request);
  test.skip(!cluster, "색인 기준(기사 3건·2진영)을 넘긴 클러스터가 없다");
  await page.goto(`/clusters/${cluster!.id}`);
  return cluster!;
}

test.describe("클러스터 상세", () => {
  test("대표 제목을 제목이자 페이지 타이틀로 쓴다", async ({ page, request }) => {
    const cluster = await openIndexable(page, request);
    await expect(detailTitle(page)).toHaveText(cluster.representativeTitle);
    await expect(page).toHaveTitle(new RegExp(escapeRe(cluster.representativeTitle)));
  });

  test("날짜·건수·언론사 수가 목록의 값과 일치한다", async ({ page, request }) => {
    const cluster = await openIndexable(page, request);
    await expect(
      page.getByText(
        `${cluster.bucketDate.replace(/-/g, ".")} · ${cluster.articleCount}건 · ${cluster.outletCount}개 언론사`
      )
    ).toBeVisible();
  });

  test("성향 분포 막대와 판정 문장을 함께 세운다", async ({ page, request }) => {
    await openIndexable(page, request);
    await expect(
      page.getByText(/(어느 쪽도 이 사건을 더 크게 다루지 않았습니다|매체가 .*보다)/)
    ).toBeVisible();
  });

  test("진보·중도·보수 세 열을 모두 세운다 — 침묵한 진영도 감추지 않는다", async ({
    page,
    request,
  }) => {
    await openIndexable(page, request);
    await expect(page.getByRole("heading", { name: "같은 사건, 세 갈래 제목" })).toBeVisible();

    const columns = page.locator("text=/^\\d+건 · \\d+개사$/");
    await expect(columns).toHaveCount(3);
  });

  test("기사가 없는 진영은 '보도 없음'으로 그 사실을 드러낸다", async ({ page, request }) => {
    const cluster = await findIndexableCluster(request);
    test.skip(!cluster, "색인 대상 클러스터가 없다");

    const groups = {
      progressive:
        (cluster!.leaningDistribution.left ?? 0) + (cluster!.leaningDistribution.center_left ?? 0),
      neutral: cluster!.leaningDistribution.center ?? 0,
      conservative:
        (cluster!.leaningDistribution.right ?? 0) +
        (cluster!.leaningDistribution.center_right ?? 0),
    };
    const silent = Object.values(groups).filter((n) => n === 0).length;
    test.skip(silent === 0, "이 클러스터는 세 진영이 모두 보도했다");

    await page.goto(`/clusters/${cluster!.id}`);
    await expect(page.getByText("보도 없음")).toHaveCount(silent);
  });

  test("원문 링크는 새 탭으로 열고 rel로 참조를 끊는다", async ({ page, request }) => {
    await openIndexable(page, request);
    const external = page.locator('a[target="_blank"]').first();
    await expect(external).toBeVisible();
    await expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(await external.getAttribute("href")).toMatch(/^https?:\/\//);
  });

  test("시간대별 보도량 절을 싣는다", async ({ page, request }) => {
    await openIndexable(page, request);
    await expect(page.getByRole("heading", { name: "시간대별 보도량" })).toBeVisible();
  });

  test("헤더에서 그날 목록으로 돌아간다 — 홈은 최신만 보여주므로 맥락이 끊긴다", async ({
    page,
    request,
  }) => {
    const cluster = await openIndexable(page, request);
    const back = page.getByRole("link", { name: /←/ }).first();
    await expect(back).toHaveAttribute("href", `/d/${cluster.bucketDate}`);

    await back.click();
    await expect(page).toHaveURL(`/d/${cluster.bucketDate}`);
  });

  test("본문이 목록과 같은 좌우 여백을 쓴다 — 상세만 full-bleed로 렌더되면 안 된다", async ({
    page,
    request,
  }) => {
    const cluster = await openIndexable(page, request);
    const detailMain = await page.locator("main").boundingBox();

    await page.goto(`/d/${cluster.bucketDate}`);
    const listMain = await page.locator("main").boundingBox();

    expect(detailMain!.x).toBeCloseTo(listMain!.x, 0);
    expect(detailMain!.width).toBeCloseTo(listMain!.width, 0);
  });
});

test.describe("클러스터 상세 — 색인 판정", () => {
  test("기준을 넘긴 클러스터는 색인을 막지 않는다", async ({ page, request }) => {
    await openIndexable(page, request);
    const robots = await robotsMeta(page);
    expect(robots ?? "").not.toContain("noindex");
  });

  test("기준 미달 클러스터는 열리되 noindex다 — 접근은 막지 않고 색인만 뺀다", async ({
    page,
    request,
  }) => {
    const cluster = await findNonIndexableCluster(request);
    test.skip(!cluster, "기준 미달 클러스터가 없다");

    await page.goto(`/clusters/${cluster!.id}`);
    // 페이지 자체는 정상 렌더된다
    await expect(detailTitle(page)).toHaveText(cluster!.representativeTitle);
    expect(await robotsMeta(page)).toContain("noindex");
    // follow는 남겨 링크 그래프를 유지한다
    expect(await robotsMeta(page)).not.toContain("nofollow");
  });

  test("색인 대상에서만 광고 로더를 붙인다", async ({ page, request }) => {
    const indexable = await findIndexableCluster(request);
    const other = await findNonIndexableCluster(request);
    test.skip(!indexable || !other, "두 종류의 클러스터가 모두 필요하다");

    const adsScript = 'script[src*="adsbygoogle"]';

    await page.goto(`/clusters/${indexable!.id}`);
    await expect(page.locator(adsScript)).toHaveCount(1);

    await page.goto(`/clusters/${other!.id}`);
    await expect(page.locator(adsScript)).toHaveCount(0);
  });
});

test.describe("클러스터 상세 — 구조화 데이터", () => {
  test("CollectionPage + ItemList와 BreadcrumbList를 싣는다", async ({ page, request }) => {
    const cluster = await openIndexable(page, request);
    const blocks = await jsonLdBlocks(page);

    const collection = blocks.find((b) => b["@type"] === "CollectionPage");
    const breadcrumb = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(collection).toBeDefined();
    expect(breadcrumb).toBeDefined();

    const list = collection!.mainEntity as { "@type": string; numberOfItems: number };
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(cluster.articleCount);
  });

  test("두 스키마가 같은 URL을 가리킨다", async ({ page, request }) => {
    await openIndexable(page, request);
    const blocks = await jsonLdBlocks(page);

    const collectionUrl = blocks.find((b) => b["@type"] === "CollectionPage")!.url;
    const items = blocks.find((b) => b["@type"] === "BreadcrumbList")!.itemListElement as {
      item: string;
    }[];
    expect(items[1].item).toBe(collectionUrl);
  });

  test("ItemList가 원문 URL을 가리킨다 (우리 페이지가 아니다)", async ({ page, request }) => {
    await openIndexable(page, request);
    const blocks = await jsonLdBlocks(page);
    const list = blocks.find((b) => b["@type"] === "CollectionPage")!.mainEntity as {
      itemListElement: { position: number; url: string }[];
    };

    expect(list.itemListElement.map((i) => i.position)).toEqual(
      list.itemListElement.map((_, i) => i + 1)
    );
    for (const item of list.itemListElement) {
      expect(item.url).toMatch(/^https?:\/\//);
      expect(item.url).not.toContain("localhost:3000/clusters");
    }
  });
});

test.describe("클러스터 상세 — 댓글", () => {
  test("비로그인에게는 입력 대신 로그인 링크를 준다", async ({ page, request }) => {
    await openIndexable(page, request);
    const comments = page.getByRole("heading", { name: /^댓글/ });
    await expect(comments).toBeVisible();

    await expect(page.getByLabel("댓글 내용")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/auth/sign-in"
    );
  });

  test("댓글이 없으면 그 사실을 말한다", async ({ page, request }) => {
    await openIndexable(page, request);
    await expect(page.getByText(/(아직 댓글이 없습니다|불러오는 중…)/).first()).toBeVisible();
  });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
