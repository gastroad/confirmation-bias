import { test, expect } from "@playwright/test";
import {
  getDays,
  getLatestDay,
  getStats,
  getClusters,
  parseLocaleNumber,
  findDayWithSoloOnFirstPage,
  PAGE_LIMIT,
} from "./fixtures";

test.describe("홈 페이지", () => {
  test("사이트 이름을 제목으로 단다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/확증편향/);
  });

  test("헤더에 브랜드와 설명이 있다", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
    await expect(header.getByRole("heading", { level: 1 })).toHaveText("확증편향");
    await expect(header).toContainText("언론사 성향별 뉴스 보도 분석");
  });

  test("리다이렉트하지 않고 홈에서 최신 날짜를 직접 보여준다", async ({ page, request }) => {
    // 리다이렉트하면 canonical이 매일 바뀌어 색인이 흩어진다.
    const latest = await getLatestDay(request);
    await page.goto("/");

    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("navigation", { name: "날짜 이동" })).toContainText(
      latest.date.replace(/-/g, ".")
    );
  });

  test("날짜 머리에 그날의 이슈·기사 수를 적는다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "날짜 이동" });
    await expect(nav).toContainText(`${latest.clusterCount.toLocaleString()}개 이슈`);
    await expect(nav).toContainText(`${latest.articleCount.toLocaleString()}건`);
    await expect(nav).toContainText(/[일월화수목금토]/);
  });

  test("하루 스펙트럼이 서버 집계와 같은 수를 말한다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const stats = await getStats(request, latest.date);
    await page.goto("/");

    const lede = page.getByText(/묶였습니다/);
    await expect(lede).toBeVisible();
    await expect(lede).toContainText(`${stats.articleCount.toLocaleString()}건`);
    await expect(lede).toContainText(`${stats.clusterCount.toLocaleString()}개 사건`);
  });

  test("스펙트럼이 균형 여부를 문장으로 판정한다", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/(진영 간 보도량은 균형에 가깝습니다|성향 매체가 .*보다)/)
    ).toBeVisible();
  });

  test("목록 머리에 균형 기준(±5%p)을 그대로 노출한다", async ({ page }) => {
    // 이 임계값은 디자인이 아니라 서비스의 주장이라 화면에 밝힌다.
    await page.goto("/");
    await expect(page.getByText(/중도 기준 · ±5%p 이내는 균형/)).toBeVisible();
  });

  test("이슈 수가 서버 집계와 일치한다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const stats = await getStats(request, latest.date);
    await page.goto("/");

    const head = page.getByText(/^이슈 [\d,]+$/);
    await expect(head).toBeVisible();
    expect(parseLocaleNumber((await head.textContent())!)).toBe(stats.clusterCount);
  });
});

test.describe("홈 — 클러스터 목록", () => {
  test("카드가 상세로 링크되고 건수·언론사 수를 싣는다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date);
    const covered = items.filter((c) => c.outletCount >= 2);
    test.skip(covered.length === 0, "이 날짜에 2개사 이상이 다룬 이슈가 없다");

    await page.goto("/");
    const first = page.locator('a[href^="/clusters/"]').first();
    await expect(first).toBeVisible();
    await expect(first).toContainText(/\d+건/);
    await expect(first).toContainText(/\d+개사/);
    await expect(first).toContainText(/(진보 \+\d+|보수 \+\d+|균형)/);
  });

  test("본 목록에는 2개사 이상이 다룬 이슈만 올린다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date);
    const covered = items.filter((c) => c.outletCount >= 2);
    test.skip(covered.length === 0, "비교 가능한 이슈가 없다");

    await page.goto("/");
    // 첫 카드의 제목이 covered 집합에 있어야 한다
    const firstTitle = await page.locator('a[href^="/clusters/"] h3').first().textContent();
    expect(covered.map((c) => c.representativeTitle)).toContain(firstTitle?.trim());
  });

  test("단독 보도는 감추지 않고 접어서 건수를 밝힌다", async ({ page, request }) => {
    const day = await findDayWithSoloOnFirstPage(request);
    test.skip(!day, "첫 페이지에 단독 보도가 걸리는 날짜가 없다");

    await page.goto(`/d/${day!.date}`);
    const summary = page.getByText(/단독 보도/).first();
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("한 매체만 다룬 이슈 · 비교 대상 없음");
    await expect(summary).toContainText(String(day!.soloCount));
  });

  test("단독 목록을 펼칠 수 있다", async ({ page, request }) => {
    const day = await findDayWithSoloOnFirstPage(request);
    test.skip(!day, "첫 페이지에 단독 보도가 걸리는 날짜가 없다");

    await page.goto(`/d/${day!.date}`);
    const details = page.locator("details").first();
    await expect(details).toHaveJSProperty("open", false);
    await page
      .getByText(/단독 보도/)
      .first()
      .click();
    await expect(details).toHaveJSProperty("open", true);
    await expect(details.getByRole("link").first()).toBeVisible();
  });

  test("스크롤하면 다음 페이지를 이어 붙인다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const { nextCursor } = await getClusters(request, latest.date, PAGE_LIMIT);
    test.skip(!nextCursor, "이 날짜는 한 페이지로 끝난다");

    await page.goto("/");
    const cardLink = 'a[href^="/clusters/"]';
    await expect(page.locator(cardLink).first()).toBeVisible();
    const before = await page.locator(cardLink).count();

    await page.mouse.wheel(0, 20000);
    await expect
      .poll(() => page.locator(cardLink).count(), { timeout: 15000 })
      .toBeGreaterThan(before);
  });
});

test.describe("홈 — 날짜 이동", () => {
  test("이전 날짜로 가면 /d/YYYY-MM-DD가 된다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    await page.goto("/");

    await page.getByLabel("이전 날짜").click();
    await expect(page).toHaveURL(/\/d\/\d{4}-\d{2}-\d{2}$/);
    // 최신 날짜보다 앞선 날짜여야 한다
    const moved = new URL(page.url()).pathname.replace("/d/", "");
    expect(moved < latest.date).toBe(true);
  });

  test("최신 날짜에서는 '다음'이 링크가 아니다 — 죽은 링크를 만들지 않는다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("다음 날짜")).toHaveCount(0);
  });

  test("필터가 없으면 이동 URL에 빈 쿼리를 붙이지 않는다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("이전 날짜").click();
    await expect(page).toHaveURL(/\/d\/\d{4}-\d{2}-\d{2}$/);
    expect(new URL(page.url()).search).toBe("");
  });

  test("날짜를 옮겨도 헤더와 목록 구조가 유지된다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("이전 날짜").click();

    await expect(page.getByRole("navigation", { name: "날짜 이동" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText(/중도 기준 · ±5%p 이내는 균형/)).toBeVisible();
  });
});

test.describe("날짜별 페이지", () => {
  test("직접 열면 그 날짜의 집계를 보여준다", async ({ page, request }) => {
    const days = await getDays(request);
    const target = days[1] ?? days[0];
    await page.goto(`/d/${target.date}`);

    const nav = page.getByRole("navigation", { name: "날짜 이동" });
    await expect(nav).toContainText(target.date.replace(/-/g, "."));
    await expect(nav).toContainText(`${target.clusterCount.toLocaleString()}개 이슈`);
  });

  test("헤더에서 최신으로 돌아갈 수 있다", async ({ page, request }) => {
    const days = await getDays(request);
    await page.goto(`/d/${(days[1] ?? days[0]).date}`);

    await page.getByRole("link", { name: "← 최신" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("데이터가 없는 과거 날짜도 열리고 그 사실을 말한다", async ({ page }) => {
    await page.goto("/d/2020-01-01");
    await expect(page.getByText("수집된 기사가 없습니다")).toBeVisible();
    await expect(page.getByText(/이 날짜에는 수집된 이슈가 없습니다/)).toBeVisible();
  });
});
