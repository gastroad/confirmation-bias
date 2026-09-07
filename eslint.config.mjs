import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ── FSD 레이어 경계 ──────────────────────────────────────────────────────────
// 규칙은 docs/agent/architecture.md·conventions.md에 있고, 여기서 강제한다.
// 문서에만 있던 동안 어긴 코드가 조용히 들어왔다(entities가 "outlets"를 문자열로 박는 등).
//
// 새 의존성 없이 코어 no-restricted-imports만 쓴다. 한 파일에 적용되는 블록은 **하나뿐**이라
// (flat config에서 같은 룰은 병합이 아니라 덮어쓰기) 레이어별로 겹치지 않게 나누고
// 필요한 패턴을 그 블록에 모두 담는다.

const DOCS = "docs/agent/conventions.md";

/** 그 레이어를 가리키는 모든 import 경로 (배럴 + 내부 전부) */
const layer = (name) => [`@/${name}`, `@/${name}/**`];

const SERVER = {
  group: ["@server", "@server/**"],
  message: `server/는 API 라우트(src/app/api/**)와 서버 컴포넌트만 import한다. UI 레이어는 entities/*/api.ts의 클라이언트 fetcher로 HTTP 호출한다. → ${DOCS}`,
};

// 배럴(index.ts)을 우회하는 deep import 금지. 슬라이스 배럴 자체(@/entities/outlet)는 허용한다.
// @x는 형제 entity 전용 통로라 바깥에서는 열지 않는다 — 여기서도 막힌다.
const BARREL = {
  group: ["@/entities/*/**", "@/features/*/**", "@/widgets/*/**"],
  message: `레이어 공개 API는 index.ts 배럴을 통해서만 노출한다. "@/entities/outlet/model"이 아니라 "@/entities/outlet". → ${DOCS}`,
};

const upward = (...names) => ({
  group: names.flatMap(layer),
  message: `FSD 레이어는 자신보다 아래만 import한다(app → widgets → features → entities → shared). → ${DOCS}`,
});

const boundaries = [
  {
    files: ["src/shared/**"],
    patterns: [upward("entities", "features", "widgets", "app"), SERVER],
  },
  {
    files: ["src/entities/**"],
    patterns: [
      upward("features", "widgets", "app"),
      SERVER,
      {
        // 같은 레이어의 슬라이스끼리는 서로 못 부른다(FSD: "strictly below"만 허용).
        // 불가피한 경우 FSD가 정한 @x 표기로만 연다 — 여는 쪽이 대상별 공개 API를 파일로 남긴다.
        // 패턴 매칭은 gitignore 의미(ignore 패키지)다. 부모가 제외되면 자식을 !로 되살릴 수
        // 없으므로, 디렉터리 표기(끝의 "/")로 슬라이스와 @x 폴더만 통과시킨 뒤 그 안의
        // 파일을 되살린다. 배럴(@/entities/outlet)은 "/"가 없어 계속 막힌다.
        group: ["@/entities/**", "!@/entities/*/", "!@/entities/*/@x/", "!@/entities/*/@x/*"],
        message: `entity끼리는 배럴로 서로 부르지 않는다. 필요하면 대상 슬라이스에 @x 공개 API를 만든다 — 예: entities/outlet/@x/cluster.ts → import from "@/entities/outlet/@x/cluster". → ${DOCS}`,
      },
    ],
  },
  {
    files: ["src/features/**"],
    patterns: [upward("widgets", "app"), SERVER, BARREL],
  },
  {
    files: ["src/widgets/**"],
    patterns: [upward("app"), SERVER, BARREL],
  },
  {
    // app은 server/를 읽는 유일한 레이어다(셸·API 라우트·서버 컴포넌트). 배럴 규약만 지킨다.
    files: ["src/app/**"],
    patterns: [BARREL],
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // useActionState의 첫 인자(prevState)는 시그니처상 반드시 받아야 하지만 대부분 쓰지 않는다.
      // 밑줄 접두사를 "의도적으로 안 씀"의 표시로 삼는다.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  ...boundaries.map(({ files, patterns }) => ({
    files,
    rules: { "no-restricted-imports": ["error", { patterns }] },
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
