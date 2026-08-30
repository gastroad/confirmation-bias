import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // 실 DB를 보므로 첫 몇 건에 서버 콜드 스타트와 Neon autosuspend wake(~600ms)가 겹친다.
  // 기본 5초로는 그 구간에서 간헐적으로 흔들린다.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // CI에서는 직접 서버를 띄움, 로컬에서는 npm run dev 가 떠있다고 가정
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
      }
    : undefined,
});
