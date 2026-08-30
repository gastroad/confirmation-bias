import { test, expect } from "@playwright/test";
import {
  getDays,
  getLatestDay,
  getClusters,
  isIndexable,
  robotsMeta,
  jsonLdBlocks,
} from "./fixtures";

test.describe("robots.txt", () => {
  test("API를 막고 sitemap을 알린다", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Disallow: /api/");
    expect(body).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test("사이트 전체를 막지 않는다 — Disallow: / 는 색인을 통째로 끈다", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).not.toMatch(/^Disallow: \/$/m);
    expect(body).toContain("Allow: /");
  });
});

test.describe("sitemap.xml", () => {
  test("유효한 XML을 준다", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");

    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
  });

  test("고정 허브 페이지를 모두 싣는다", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/about", "/weekly", "/outlets", "/privacy", "/terms"]) {
      expect(body, path).toContain(`${path}</loc>`);
    }
  });

  test("URL이 중복되지 않는다 — 같은 주소를 두 번 내면 크롤 예산을 낭비한다", async ({
    request,
  }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(new Set(locs).size).toBe(locs.length);
  });

  test("모든 URL이 절대 주소다", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) expect(loc).toMatch(/^https?:\/\//);
  });

  test("색인 기준을 넘긴 클러스터만 싣는다 — 껍데기를 내보내지 않는다", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date, 50);

    const excluded = items.filter((c) => !isIndexable(c));
    test.skip(excluded.length === 0, "기준 미달 클러스터가 없다");
    for (const c of excluded.slice(0, 5)) {
      expect(body, c.id).not.toContain(`/clusters/${c.id}<`);
    }
  });

  test("기사가 있는 언론사 페이지를 싣는다", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain("/outlets/hani</loc>");
  });
});

test.describe("메타데이터", () => {
  test("홈에 설명·canonical·OG가 있다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('head meta[name="description"]')).toHaveAttribute(
      "content",
      /언론사/
    );
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('head meta[property="og:image"]')).toHaveCount(1);
  });

  test("언어를 ko로 선언한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  });

  test("AdSense 소유 증명 메타는 루트에 그대로 둔다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('head meta[name="google-adsense-account"]')).toHaveAttribute(
      "content",
      /^ca-pub-/
    );
  });

  test("ads.txt가 게시자 ID를 싣는다", async ({ request }) => {
    const res = await request.get("/ads.txt");
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/google\.com, pub-\d+, DIRECT/);
  });

  test("날짜 페이지의 canonical이 그 날짜를 가리킨다", async ({ page, request }) => {
    const days = await getDays(request);
    const target = days[1] ?? days[0];
    await page.goto(`/d/${target.date}`);

    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/d/${target.date}$`)
    );
  });

  test("홈에 WebSite JSON-LD를 싣는다", async ({ page }) => {
    await page.goto("/");
    const blocks = await jsonLdBlocks(page);
    const website = blocks.find((b) => b["@type"] === "WebSite");

    expect(website).toBeDefined();
    expect(website!.inLanguage).toBe("ko-KR");
    expect(String(website!.url)).toMatch(/^https?:\/\//);
  });
});

test.describe("색인 정책", () => {
  test("기사가 없는 날짜는 색인에서 뺀다 (follow는 남긴다)", async ({ page }) => {
    await page.goto("/d/2020-01-01");
    const robots = await robotsMeta(page);
    expect(robots).toContain("noindex");
    expect(robots).not.toContain("nofollow");
  });

  test("최신 날짜는 색인을 막지 않는다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date, 50);
    test.skip(!items.some(isIndexable), "최신 날짜에 색인 대상 이슈가 없다");

    await page.goto(`/d/${latest.date}`);
    expect((await robotsMeta(page)) ?? "").not.toContain("noindex");
  });

  test("읽을 콘텐츠가 없는 화면에는 광고를 붙이지 않는다", async ({ page }) => {
    // 루트 레이아웃에 로더를 두면 이 화면들에도 자동광고가 붙는다 — 그 자체가 정책 위반이다.
    const adsScript = 'script[src*="adsbygoogle"]';
    for (const path of ["/auth/sign-in", "/auth/sign-up", "/terms", "/privacy"]) {
      await page.goto(path);
      await expect(page.locator(adsScript), path).toHaveCount(0);
    }
  });

  test("콘텐츠가 있는 날짜에는 광고 로더가 붙는다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const { items } = await getClusters(request, latest.date, 50);
    test.skip(!items.some(isIndexable), "색인 대상 이슈가 없다");

    await page.goto(`/d/${latest.date}`);
    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(1);
  });

  test("기사가 없는 날짜에는 광고를 붙이지 않는다", async ({ page }) => {
    await page.goto("/d/2020-01-01");
    await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0);
  });
});
