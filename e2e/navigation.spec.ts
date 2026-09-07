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
    await expect(page.getByRole("main")).toContainText(/한계|완벽하지|주의/);
  });
});

// 주간 리포트·언론사는 날짜별 목록(홈)만으로는 닿지 않는 다른 축의 읽을거리다.
// 푸터에 있던 동안은 존재 자체가 발견되지 않아 헤더로 올렸다 → widgets/site-header.
test.describe("헤더 주요 메뉴", () => {
  test("모든 페이지의 헤더에서 주간 리포트·언론사로 갈 수 있다", async ({ page }) => {
    for (const path of ["/", "/weekly", "/outlets", "/about"]) {
      await page.goto(path);
      const header = page.getByRole("banner");

      await expect(header.getByRole("link", { name: "주간 리포트" }), path).toHaveAttribute(
        "href",
        "/weekly"
      );
      await expect(header.getByRole("link", { name: "언론사" }), path).toHaveAttribute(
        "href",
        "/outlets"
      );
    }
  });

  test("보고 있는 자리를 aria-current로 알린다", async ({ page }) => {
    await page.goto("/weekly");
    const header = page.getByRole("banner");

    await expect(header.getByRole("link", { name: "주간 리포트" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(header.getByRole("link", { name: "언론사" })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("가장 좁은 화면에서도 헤더가 한 줄에 들어간다", async ({ page }) => {
    // 백링크·브랜드·메뉴가 한 줄에 서는 최악의 조합(백링크가 있는 화면) + 320px.
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/d/2020-01-01");

    const header = (await page.getByRole("banner").boundingBox())!;
    expect(header.height).toBeLessThan(80);

    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docWidth).toBeLessThanOrEqual(320);
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

  // 헤더·본문·푸터가 좌우 여백을 각자 적던 동안 세로줄이 갈렸다(약관·방침·소개는 자체
  // 컨테이너를 써 16px을 썼다). 지금은 셋 다 layout.css의 gutters 하나를 합성한다.
  test("푸터 링크가 헤더·본문과 같은 좌우 여백을 쓴다", async ({ page }) => {
    for (const path of ["/", "/weekly", "/outlets", "/about", "/terms", "/privacy"]) {
      await page.goto(path);
      const header = await page.getByRole("banner").locator("> div").boundingBox();
      const main = await page.getByRole("main").boundingBox();
      const footer = await page.getByRole("contentinfo").locator("> div").boundingBox();

      expect(header!.x, path).toBeCloseTo(main!.x, 0);
      expect(footer!.x, path).toBeCloseTo(main!.x, 0);
    }
  });
});

// 읽는 글은 한 줄이 길어지지 않게 본문 열을 좁힌다. 좁히는 방식이 관건이라 못박아 둔다 —
// 컨테이너째 좁혀 가운데 정렬하면 글이 헤더의 세로줄보다 오른쪽에서 시작한다.
test.describe("읽는 글의 본문 열", () => {
  for (const path of ["/about", "/terms", "/privacy"]) {
    test(`${path} 의 글이 브랜드와 같은 세로줄에서 시작한다`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);

      // 브랜드 락업(로고+워드마크)의 왼쪽 끝이 지면의 세로줄이다.
      const brand = await page.getByRole("banner").getByRole("link").first().boundingBox();
      const heading = await page.getByRole("main").getByRole("heading", { level: 1 }).boundingBox();

      expect(heading!.x).toBeCloseTo(brand!.x, 0);
      // 그러면서 지면 폭(64rem)보다는 좁다 — 한 줄이 100자를 넘지 않게
      expect(heading!.width).toBeLessThan(800);
    });
  }
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
