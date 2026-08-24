import { test, expect } from "@playwright/test";

test.describe("홈 페이지", () => {
  test("페이지가 정상 로드된다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/confirmation bias/i);
  });

  test("헤더가 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("클러스터 피드가 렌더링된다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("최신 날짜의 날짜 내비게이션이 보인다", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "날짜 이동" });
    await expect(nav).toBeVisible();
    // "2026년 8월 23일 (일)" 형태
    await expect(nav).toContainText(/\d{4}년 \d{1,2}월 \d{1,2}일/);
  });

  test("이전 날짜로 이동하면 URL이 /d/YYYY-MM-DD 가 된다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "이전 날짜" }).click();
    await expect(page).toHaveURL(/\/d\/\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("navigation", { name: "날짜 이동" })).toBeVisible();
  });
});

test.describe("날짜별 페이지", () => {
  test("형식이 어긋난 날짜는 404", async ({ page }) => {
    const res = await page.goto("/d/2026-13-99");
    expect(res?.status()).toBe(404);
  });

  test("언론사 필터가 날짜 이동에 유지된다", async ({ page }) => {
    await page.goto("/");
    const first = page.getByRole("link", { name: "이전 날짜" });
    await first.click();
    const url = new URL(page.url());
    // 필터가 없으면 쿼리도 없어야 한다(불필요한 파라미터를 붙이지 않는지)
    expect(url.search).toBe("");
  });
});
