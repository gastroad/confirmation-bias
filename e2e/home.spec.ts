import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import {
  getDays,
  getLatestDay,
  getStats,
  getClusters,
  parseLocaleNumber,
  findDayWithThinOnFirstPage,
  isIndexable,
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

  test("목록 머리의 이슈 수가 서버 집계와 일치한다 — 불러온 페이지가 아니라 범위 전체다", async ({
    page,
    request,
  }) => {
    const latest = await getLatestDay(request);
    const stats = await getStats(request, latest.date);
    await page.goto("/");

    const head = page.getByText(/^비교 가능한 이슈 [\d,]+/);
    await expect(head).toBeVisible();
    const text = (await head.textContent())!;
    // "비교 가능한 이슈 35 · 그 외 118" — 앞 숫자가 색인 대상 수다.
    const [first] = text.replace(/^비교 가능한 이슈\s*/, "").split("·");
    expect(parseLocaleNumber(first)).toBe(stats.indexableClusterCount);

    if (stats.clusterCount > stats.indexableClusterCount) {
      expect(text).toContain("그 외");
      const rest = text.split("그 외")[1];
      expect(parseLocaleNumber(rest)).toBe(stats.clusterCount - stats.indexableClusterCount);
    }
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

  test("본 목록에는 색인 기준을 넘긴 이슈만 올린다 — 나머지는 개별 페이지가 없다", async ({
    page,
    request,
  }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date);
    const comparable = items.filter(isIndexable);
    test.skip(comparable.length === 0, "비교 가능한 이슈가 없다");

    await page.goto("/");
    const firstTitle = await page.locator('a[href^="/clusters/"] h3').first().textContent();
    expect(comparable.map((c) => c.representativeTitle)).toContain(firstTitle?.trim());
  });

  test("목록이 링크하는 모든 이슈가 색인 기준을 넘는다 — 404로 가는 링크를 뿌리지 않는다", async ({
    page,
    request,
  }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date, PAGE_LIMIT);
    const thinTitles = new Set(
      items.filter((c) => !isIndexable(c)).map((c) => c.representativeTitle)
    );
    test.skip(thinTitles.size === 0, "첫 페이지에 기준 미달 이슈가 없다");

    await page.goto("/");
    const linked = await page.locator('a[href^="/clusters/"] h3').allTextContents();
    for (const t of linked) expect(thinTitles.has(t.trim())).toBe(false);
  });

  test("기준 미달 이슈는 감추지 않고 접어서 건수를 밝힌다 (링크 없이)", async ({
    page,
    request,
  }) => {
    const day = await findDayWithThinOnFirstPage(request);
    test.skip(!day, "첫 페이지에 기준 미달 이슈가 걸리는 날짜가 없다");

    await page.goto(`/d/${day!.date}`);
    const summary = page.getByText(/비교가 성립하지 않는 이슈/).first();
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("개별 페이지 없음");
    await expect(summary).toContainText(String(day!.thinCount));
  });

  test("미달 목록을 펼칠 수 있고 그 안에는 링크가 없다", async ({ page, request }) => {
    const day = await findDayWithThinOnFirstPage(request);
    test.skip(!day, "첫 페이지에 기준 미달 이슈가 걸리는 날짜가 없다");

    await page.goto(`/d/${day!.date}`);
    const details = page.locator("details").first();
    await expect(details).toHaveJSProperty("open", false);
    await page
      .getByText(/비교가 성립하지 않는 이슈/)
      .first()
      .click();
    await expect(details).toHaveJSProperty("open", true);
    // 제목은 보이지만 누를 수 있는 링크는 없다 — 상세 페이지가 404다
    await expect(details.locator("li").first()).toBeVisible();
    await expect(details.getByRole("link")).toHaveCount(0);
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

/**
 * **초기 HTML에 목록이 실려 있는가.** `page`가 아니라 `request`로 날 HTML을 받아 본다 —
 * 브라우저로 열면 react-query가 뒤이어 받아오므로 둘을 구분할 수 없다.
 *
 * 광고가 뜨는 72개 페이지(홈 1 + 날짜 71)의 본문이 132자였다. 목록을 클라이언트가
 * 그려 초기 HTML에 이슈가 한 건도 없었고, 그건 심사 통보 항목 "가치가 별로 없는
 * 콘텐츠"와 정확히 겹친다. → docs/agent/adsense-compliance.md
 */
test.describe("첫 화면 SSR — 초기 HTML에 목록이 실린다", () => {
  const bodyText = async (request: APIRequestContext, path: string) => {
    const res = await request.get(path);
    expect(res.ok()).toBe(true);
    const html = await res.text();
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? html;
    return body
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<template[\s\S]*?<\/template>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  };

  test("홈의 초기 HTML이 첫 페이지 이슈 제목을 담는다", async ({ request }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date, PAGE_LIMIT);
    test.skip(items.length === 0, "최신 날짜에 이슈가 없다");

    const text = await bodyText(request, "/");
    // 제목에 따옴표·특수문자가 섞이므로 앞 12자만 대조한다(엔티티 복원 차이를 피한다).
    expect(text).toContain(items[0].representativeTitle.slice(0, 12));
  });

  test("날짜 페이지의 초기 HTML도 같다", async ({ request }) => {
    const days = await getDays(request);
    const target = days[1] ?? days[0];
    const { items } = await getClusters(request, target.date, PAGE_LIMIT);
    test.skip(items.length === 0, "그 날짜에 이슈가 없다");

    const text = await bodyText(request, `/d/${target.date}`);
    expect(text).toContain(items[0].representativeTitle.slice(0, 12));
  });

  test("하루 스펙트럼 문장도 초기 HTML에 있다 — 스켈레톤이 아니다", async ({ request }) => {
    const latest = await getLatestDay(request);
    const stats = await getStats(request, latest.date);
    const text = await bodyText(request, "/");

    expect(text).toContain("묶였습니다");
    expect(text).toContain(`${stats.clusterCount.toLocaleString()}개 사건`);
  });

  test("언론사 필터도 서버가 반영한다 — 필터가 걸린 URL이 빈 지면으로 나가지 않는다", async ({
    request,
  }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date, PAGE_LIMIT);
    test.skip(items.length === 0, "최신 날짜에 이슈가 없다");

    const filtered = await bodyText(request, "/?outlets=hani,chosun");
    expect(filtered).toContain("묶였습니다");
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
