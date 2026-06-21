import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

// Vitest 4에서 environmentMatchGlobs가 제거됨 → test.projects로 환경별 분리.
// 각 project는 extends:true로 루트(plugins, globals)를 상속받고 자기 환경만 지정.
// tsconfig paths는 Vite 8 네이티브 resolve.tsconfigPaths로 처리 (vite-tsconfig-paths 제거).
export default defineConfig({
  plugins: [vanillaExtractPlugin(), react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          include: ["server/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "src",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
        },
      },
    ],
  },
});
