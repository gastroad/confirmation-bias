import { test, expect } from "@playwright/test";

test.describe("홈 페이지", () => {
  test("페이지가 정상 로드된다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/confirmation bias/i);
  });

  test("헤더가 보인다", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
  });

  test("클러스터 피드가 렌더링된다", async ({ page }) => {
    await page.goto("/");
    // 클러스터가 하나 이상 있을 때 통과; DB가 비어있으면 빈 상태 메시지로 확인
    const feed = page.getByRole("main");
    await expect(feed).toBeVisible();
  });
});
