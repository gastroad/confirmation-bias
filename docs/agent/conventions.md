# Conventions

## Import 경로

| 상황                              | 사용할 alias                                 |
| --------------------------------- | -------------------------------------------- |
| `src/` 내부에서 `src/` 참조       | `@/`                                         |
| `src/` 내부에서 `server/` 참조    | `@server/` (entities/cluster/api.ts 만 허용) |
| `server/` 내부에서 `server/` 참조 | 상대 경로 (`../db`, `./similarity`)          |
| `scripts/`, `prisma/` → `server/` | `../server/db` 등 상대 경로                  |

**절대 금지:** `src/` 컴포넌트에서 `server/clustering/*` 직접 import

## FSD 엄격 규칙

- 각 레이어는 자신보다 **아래 레이어만** import한다.
- entity가 다른 entity를 import하면 안 된다 (cross-entity 금지).
  - 예외: `entities/cluster/model.ts`가 `OutletMetadata` 타입만 참조하는 것은 허용.
- 레이어 공개 API는 반드시 `index.ts` 배럴을 통해 노출한다.
- `ui/` 폴더 안 컴포넌트는 props만 받는 dumb 컴포넌트. 상태·fetch 금지.

## 파일 생성 위치 결정 기준

| 추가할 것                 | 어디에                                      |
| ------------------------- | ------------------------------------------- |
| 새 도메인 타입            | `src/entities/<name>/model.ts`              |
| 새 도메인 UI (props-only) | `src/entities/<name>/ui/<Component>.tsx`    |
| 페이지 수준 UI 조합       | `src/widgets/<name>/ui/<Widget>.tsx`        |
| 날짜·문자열 유틸          | `src/shared/lib/`                           |
| DB 쿼리 (서버 전용)       | `src/entities/<name>/api.ts` 또는 `server/` |
| BE 파이프라인 로직        | `server/clustering/`                        |
| 일회성 실행 스크립트      | `scripts/`                                  |

## 코드 스타일

- TypeScript 전용. `any` 사용 금지.
- 주석은 WHY가 비명백할 때만. WHAT 설명 주석 금지.
- 함수/변수명이 충분히 설명적이면 JSDoc 불필요.
- Prettier 설정 (`.prettierrc`): semi, double quote, tabWidth 2, trailingComma es5, printWidth 100.

## 테스트

- 단위 테스트: `*.test.ts` 파일을 테스트 대상 파일 옆에 위치.
- E2E: `e2e/` 디렉토리.
- `npm run test:unit -- --run` 으로 단위 테스트 실행.
- Server Component는 Vitest로 테스트 불가 → E2E(Playwright)로 커버.
