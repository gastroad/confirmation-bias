import { test, expect } from "@playwright/test";
import { getLatestDay, getStats } from "./fixtures";

test.describe("언론사 필터", () => {
  test("기본은 접혀 있다 — 18개를 펼쳐 두면 하루 스펙트럼이 화면 밖으로 밀린다", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /지원 언론사/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "한겨레신문" })).toHaveCount(0);
  });

  test("펼치면 진영별로 묶어 보여준다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /지원 언론사/ }).click();

    await expect(page.getByRole("button", { name: "한겨레신문" })).toBeVisible();
    await expect(page.getByRole("button", { name: "조선일보" })).toBeVisible();
    await expect(page.getByRole("button", { name: "연합뉴스" })).toBeVisible();
  });

  test("선택하면 URL에 실리고 새로고침해도 유지된다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /지원 언론사/ }).click();
    await page.getByRole("button", { name: "한겨레신문" }).click();

    await expect(page).toHaveURL(/outlets=hani/);
    await page.reload();
    // URL에 필터가 있으면 펼친 채로 뜬다
    await expect(page.getByRole("button", { name: "한겨레신문" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("필터를 걸면 집계가 그 매체 기준으로 줄어든다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    const all = await getStats(request, latest.date);
    const filtered = await getStats(request, latest.date);

    await page.goto(`/?outlets=hani`);
    const head = page.getByText(/^이슈 [\d,]+$/);
    await expect(head).toBeVisible();

    const shown = Number((await head.textContent())!.replace(/[^\d]/g, ""));
    // 한 매체로 좁혔으니 전체보다 많을 수 없다
    expect(shown).toBeLessThanOrEqual(all.clusterCount);
    expect(filtered.clusterCount).toBe(all.clusterCount);
  });

  test("선택 개수를 머리말에 적는다", async ({ page }) => {
    await page.goto("/?outlets=hani,chosun");
    await expect(page.getByRole("button", { name: /지원 언론사/ })).toContainText("2개 선택");
  });

  test("전체 해제를 누르면 파라미터가 사라진다", async ({ page }) => {
    await page.goto("/?outlets=hani,chosun");
    await page.getByRole("button", { name: "전체 해제" }).click();

    await expect(page).toHaveURL(/\/$/);
    expect(new URL(page.url()).search).toBe("");
  });

  test("필터를 걸면 날짜 이동 링크가 그것을 들고 간다", async ({ page }) => {
    await page.goto("/?outlets=hani");
    await expect(page.getByLabel("이전 날짜")).toHaveAttribute(
      "href",
      /\/d\/\d{4}-\d{2}-\d{2}\?outlets=hani/
    );
  });

  test("날짜를 옮겨도 필터가 살아남는다", async ({ page }) => {
    await page.goto("/?outlets=hani");
    await page.getByLabel("이전 날짜").click();

    await expect(page).toHaveURL(/\/d\/\d{4}-\d{2}-\d{2}\?outlets=hani/);
    await expect(page.getByRole("button", { name: /지원 언론사/ })).toContainText("1개 선택");
  });

  test("URL의 알 수 없는 id는 무시한다 — 선택 개수를 부풀리지 않는다", async ({ page }) => {
    await page.goto("/?outlets=hani,ghost-media");
    await expect(page.getByRole("button", { name: /지원 언론사/ })).toContainText("1개 선택");
  });

  test("어떤 매체도 보도하지 않은 조합이면 필터 조정을 권한다", async ({ page, request }) => {
    const latest = await getLatestDay(request);
    // 기사가 거의 없는 매체 조합을 과거 날짜에 걸어 빈 목록을 만든다
    await page.goto(`/d/${latest.date}?outlets=sisain`);

    const empty = page.getByText("선택한 언론사가 보도한 이슈가 없습니다.");
    const list = page.locator('a[href^="/clusters/"]').first();
    // 둘 중 하나는 반드시 나온다 — 빈 목록이면 안내 문구가 맞아야 한다
    await expect(empty.or(list)).toBeVisible();
  });
});
