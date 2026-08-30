import { test, expect } from "@playwright/test";

// 테마는 localStorage와 <html data-theme> 두 곳에 함께 반영된다.
// 하나만 갱신되면 FOUC 방지 스크립트와 어긋나 새로고침 때 화면이 번쩍인다.

async function openMenu(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "계정 메뉴" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
}

test.describe("테마 전환", () => {
  test("기본은 시스템 설정을 따른다 — data-theme을 남기지 않는다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  });

  test("메뉴에서 세 가지를 고를 수 있다", async ({ page }) => {
    await openMenu(page);
    for (const label of ["시스템", "라이트", "다크"]) {
      await expect(page.getByRole("menuitemradio", { name: label })).toBeVisible();
    }
  });

  test("다크를 고르면 html에 반영되고 저장된다", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "다크" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => localStorage.getItem("cb-theme"))).toBe("dark");
  });

  test("새로고침해도 유지된다 (FOUC 없이)", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "다크" }).click();
    await page.reload();

    // 스크립트가 <head>에서 미리 칠하므로 첫 페인트부터 dark다
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("시스템으로 되돌리면 저장값과 속성을 모두 지운다", async ({ page }) => {
    await openMenu(page);
    // 테마를 골라도 메뉴는 열린 채 남는다 — 연달아 바꿔 보게 하려는 것이다.
    await page.getByRole("menuitemradio", { name: "다크" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("menuitemradio", { name: "시스템" }).click();

    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    expect(await page.evaluate(() => localStorage.getItem("cb-theme"))).toBeNull();
  });

  test("다크에서도 본문이 배경에 묻히지 않는다", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "다크" }).click();
    await page.keyboard.press("Escape");

    const colors = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return { bg: body.backgroundColor, fg: body.color };
    });
    expect(colors.bg).not.toBe(colors.fg);
    expect(colors.bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("Escape로 메뉴를 닫는다", async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("바깥을 누르면 메뉴가 닫힌다", async ({ page }) => {
    await openMenu(page);
    await page.locator("main").click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("비로그인 메뉴가 로그인으로 이어진다", async ({ page }) => {
    await openMenu(page);
    // 메뉴 항목이라 link가 아니라 menuitem role이다.
    const signIn = page.getByRole("menuitem", { name: "로그인" });
    await expect(signIn).toHaveAttribute("href", "/auth/sign-in");

    await signIn.click();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("선택된 테마에 체크 표시를 남긴다 — 색만으로 알리지 않는다", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "다크" }).click();

    await expect(page.getByRole("menuitemradio", { name: "다크" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(page.getByRole("menuitemradio", { name: "라이트" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });
});
