import { defineConfig } from "vitest/config";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

// Vitest 4에서 environmentMatchGlobs가 제거됨 → test.projects로 환경별 분리.
// 각 project는 extends:true로 루트(plugins, globals)를 상속받고 자기 환경만 지정.
// tsconfig paths는 Vite 8 네이티브 resolve.tsconfigPaths로 처리 (vite-tsconfig-paths 제거).
//
// vanilla-extract 플러그인이 필요한 이유: entities 배럴이 leaning-colors → theme.css를
// 끌고 온다. 순수 함수 테스트라도 import 경로에 .css.ts가 걸리면 이게 있어야 로드된다.
//
// jsdom을 쓰는 테스트는 shared/lib/theme(localStorage·document)뿐이지만, src 전체를
// 한 환경으로 두는 편이 단순하다. API 라우트 테스트는 파일 상단 `@vitest-environment node`로 뺀다.
export default defineConfig({
  plugins: [vanillaExtractPlugin()],
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
          include: ["src/**/*.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
