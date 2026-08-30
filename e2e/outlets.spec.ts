import { test, expect } from "@playwright/test";
import { robotsMeta } from "./fixtures";

test.describe("언론사 허브", () => {
  test("목록 페이지가 열린다", async ({ page }) => {
    await page.goto("/outlets");
    await expect(page.getByRole("link", { name: /한겨레신문/ }).first()).toBeVisible();
  });

  test("각 언론사가 상세로 링크된다", async ({ page }) => {
    await page.goto("/outlets");
    const link = page.locator('a[href^="/outlets/"]').first();
    await expect(link).toBeVisible();

    await link.click();
    await expect(page).toHaveURL(/\/outlets\/[a-z0-9_]+$/);
  });
});

test.describe("언론사 상세", () => {
  test("이름을 제목으로 쓰고 자체 집계 문장을 싣는다", async ({ page }) => {
    await page.goto("/outlets/hani");
    // 본문은 전부 우리가 계산한 값이라 원문 복제가 0이다 — 이 페이지의 존재 이유다.
    await expect(page).toHaveTitle(/한겨레신문/);
    await expect(page.getByText(/기사 [\d,]+건을 수집했고/)).toBeVisible();
    await expect(page.getByText(/단독 보도/).first()).toBeVisible();
  });

  test("집계 문장에 NaN이나 undefined가 새지 않는다", async ({ page }) => {
    for (const id of ["hani", "chosun", "yonhap", "sisain"]) {
      await page.goto(`/outlets/${id}`);
      const body = await page.locator("main").textContent();
      expect(body, id).not.toMatch(/NaN|undefined/);
    }
  });

  test("허브로 돌아갈 수 있다", async ({ page }) => {
    await page.goto("/outlets/hani");
    await page.getByRole("link", { name: "← 언론사" }).click();
    await expect(page).toHaveURL(/\/outlets$/);
  });

  test("기사가 있는 매체는 색인을 막지 않는다", async ({ page }) => {
    await page.goto("/outlets/hani");
    expect((await robotsMeta(page)) ?? "").not.toContain("noindex");
  });

  test("명단에 없는 언론사는 404 화면을 보여준다", async ({ page }) => {
    await page.goto("/outlets/ghost-media");
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  });
});
