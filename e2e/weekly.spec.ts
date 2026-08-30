import { test, expect } from "@playwright/test";

// 주간 리포트는 정책이 말하는 "선별 게재(curation)"가 페이지 내용 그 자체다.
// **무엇을 어떤 기준으로 골랐는지 화면에 밝히는 것**이 이 페이지의 요건이다.
// → docs/agent/adsense-compliance.md

test.describe("주간 리포트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/weekly");
  });

  test("제목과 기간을 세운다", async ({ page }) => {
    await expect(page).toHaveTitle(/주간 리포트/);
    await expect(page.getByRole("heading", { name: "주간 리포트" })).toBeVisible();
    await expect(page.getByText(/\d{4}-\d{2}-\d{2} — \d{4}-\d{2}-\d{2}/)).toBeVisible();
  });

  test("선별 기준을 화면에 그대로 밝힌다 — 사람이 고르지 않는다는 것까지", async ({ page }) => {
    // "선별 기준"은 <strong>이라 그 자체로는 한 단어뿐이다. 문단 전체를 잡는다.
    const criteria = page.locator("p").filter({ hasText: "선별 기준" });
    await expect(criteria).toBeVisible();
    await expect(criteria).toContainText("기사 3건 이상");
    await expect(criteria).toContainText("기사 6건 이상");
    await expect(criteria).toContainText("±5%p");
    await expect(criteria).toContainText("사람이 고르지 않고 이 규칙만으로 뽑습니다");
  });

  test("두 섹션을 각각의 근거와 함께 세운다", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "진영 간 보도량이 갈린 이슈" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "세 진영이 모두 다룬 이슈" })).toBeVisible();
    await expect(page.getByText(/막대가 중심선에서 벗어난 만큼이 그 차이입니다/)).toBeVisible();
    await expect(page.getByText(/성향과 무관하게 무게가 실린 사건입니다/)).toBeVisible();
  });

  test("항목에 순위·성향 막대·편중 수치를 싣는다", async ({ page }) => {
    const items = page.locator('a[href^="/clusters/"]');
    const count = await items.count();
    test.skip(count === 0, "이 기간에는 기준을 넘긴 이슈가 없다");

    const first = items.first();
    await expect(first).toContainText(/^01/);
    await expect(first).toContainText(/\d+건/);
    await expect(first).toContainText(/\d+개사/);
    await expect(first).toContainText(/(진보 \+\d+%p|보수 \+\d+%p|균형)/);
  });

  test("편중 목록은 절댓값이 큰 순이다", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "진영 간 보도량이 갈린 이슈" });
    const labels = await section.getByText(/[진보수]+ \+\d+%p/).allTextContents();
    test.skip(labels.length < 2, "비교할 항목이 부족하다");

    const values = labels.map((t) => Number(t.match(/\+(\d+)%p/)![1]));
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  test("편중 목록에 균형(±5%p 이내) 이슈가 섞이지 않는다", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "진영 간 보도량이 갈린 이슈" });
    const items = section.locator('a[href^="/clusters/"]');
    test.skip((await items.count()) === 0, "항목이 없다");
    await expect(section.getByText("균형")).toHaveCount(0);
  });

  test("항목을 누르면 상세로 간다", async ({ page }) => {
    const first = page.locator('a[href^="/clusters/"]').first();
    test.skip((await page.locator('a[href^="/clusters/"]').count()) === 0, "항목이 없다");

    await first.click();
    await expect(page).toHaveURL(/\/clusters\/[\w-]+/);
    await expect(page.getByRole("heading", { name: "같은 사건, 세 갈래 제목" })).toBeVisible();
  });

  test("홈으로 돌아갈 수 있다", async ({ page }) => {
    await page.getByRole("link", { name: "← 홈" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
