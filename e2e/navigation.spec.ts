import { test, expect } from "@playwright/test";

test.describe("정적 페이지", () => {
  const pages = [
    { path: "/about", title: /소개|방법론/, marker: /방법론|분류/ },
    { path: "/terms", title: /이용약관/, marker: /저작권|게시물/ },
    { path: "/privacy", title: /개인정보/, marker: /개인정보/ },
  ];

  for (const { path, title, marker } of pages) {
    test(`${path} 가 열리고 본문이 있다`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.getByText(marker).first()).toBeVisible();
    });
  }

  test("소개 페이지가 한계를 고지한다 — 방법론 페이지의 요건이다", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("main, body")).toContainText(/한계|완벽하지|주의/);
  });
});

test.describe("푸터", () => {
  test("모든 페이지에 뜬다", async ({ page }) => {
    for (const path of ["/", "/weekly", "/outlets", "/about"]) {
      await page.goto(path);
      await expect(page.getByRole("contentinfo"), path).toBeVisible();
    }
  });

  test("약관·개인정보·문의로 이어진다", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await expect(footer.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    await expect(footer.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute(
      "href",
      "/privacy"
    );
    await expect(footer.getByRole("link", { name: "문의" })).toHaveAttribute("href", /^mailto:/);
  });

  test("내용이 짧아도 푸터가 화면 아래에 붙는다 — 빈 화면을 한 번 스크롤하지 않게", async ({
    page,
  }) => {
    // 본문이 확실히 뷰포트보다 짧도록 키를 크게 잡는다.
    // minHeight:100vh로 두면 문서가 뷰포트보다 길어져 스크롤이 생긴다 — 그걸 잡는 테스트다.
    await page.setViewportSize({ width: 1280, height: 1600 });
    await page.goto("/d/2020-01-01");
    await expect(page.getByText("수집된 기사가 없습니다")).toBeVisible();

    const viewport = page.viewportSize()!;
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(docHeight).toBeLessThanOrEqual(viewport.height + 1);

    // 그러면서도 푸터는 바닥까지 내려와 있다(가운데 떠 있지 않다)
    const footer = (await page.getByRole("contentinfo").boundingBox())!;
    expect(footer.y + footer.height).toBeCloseTo(viewport.height, 0);
  });

  test("푸터 링크가 헤더·본문과 같은 좌우 여백을 쓴다", async ({ page }) => {
    await page.goto("/");
    const header = await page.getByRole("banner").locator("> div").boundingBox();
    const main = await page.locator("main").boundingBox();
    const footer = await page.getByRole("contentinfo").locator("> div").boundingBox();

    expect(header!.x).toBeCloseTo(main!.x, 0);
    expect(footer!.x).toBeCloseTo(main!.x, 0);
  });
});

test.describe("찾을 수 없는 페이지", () => {
  test("정적으로 매칭되지 않는 경로는 404 상태다", async ({ page }) => {
    const res = await page.goto("/이런-경로는-없다");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  });

  test("404 화면이 최신 뉴스로 되돌아갈 길을 준다", async ({ page }) => {
    await page.goto("/nope");
    await page.getByRole("link", { name: "최신 뉴스 보기" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("404 화면은 색인하지 않는다", async ({ page }) => {
    await page.goto("/nope");
    await expect(page.locator('head meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/
    );
  });

  /**
   * **동적 라우트의 notFound()는 HTTP 200으로 나간다 (soft 404).**
   *
   * `/d/[date]`·`/clusters/[id]`·`/outlets/[id]`는 async `generateMetadata`를 쓴다.
   * 응답이 스트리밍으로 시작된 뒤에 `notFound()`가 호출되므로 상태 줄을 되돌릴 수 없다.
   * 화면과 robots 메타(noindex)는 올바르지만 상태 코드만 200이다.
   *
   * **dev 전용 현상이 아니다** — `next build && next start`로도 확인했다(2026-08-27).
   * 정적으로 매칭되지 않는 경로(`/nope`)만 제대로 404가 나온다.
   *
   * 클러스터 id는 재클러스터링마다 바뀌므로 이미 색인된 상세 URL이 대량으로 이 경로를
   * 탄다. 지금 동작을 그대로 못박아 두고, 고쳐서 404가 나오기 시작하면 이 테스트가
   * 깨지며 알려 준다 — 그때 기대값을 404로 바꾼다.
   */
  test("잘못된 날짜는 404 화면을 보여준다 (상태 코드는 현재 200 — soft 404)", async ({ page }) => {
    const res = await page.goto("/d/2026-13-99");
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
    await expect(page.locator('head meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/
    );
    expect(res?.status()).toBe(200);
  });

  test("존재하지 않는 클러스터도 404 화면을 보여준다 (상태 코드는 현재 200)", async ({ page }) => {
    const res = await page.goto("/clusters/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
    await expect(page.locator('head meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/
    );
    expect(res?.status()).toBe(200);
  });
});

test.describe("관리자 영역 보호", () => {
  test("비로그인은 /admin에 머무르지 못한다", async ({ page }) => {
    await page.goto("/admin");
    // 로그인 페이지로 보내거나, 페이지가 스스로 권한을 다시 보고 막는다
    const signIn = page.getByRole("heading", { name: /로그인/ });
    const denied = page.getByText(/권한|찾을 수 없습니다/);
    await expect(signIn.or(denied).first()).toBeVisible();
  });
});
