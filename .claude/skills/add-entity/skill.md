---
name: add-entity
description: FSD 규칙에 따라 새 Entity를 추가합니다. 사용자가 새 entity 추가, 새 도메인 모델 생성, 새 FSD 슬라이스 추가를 요청할 때 사용합니다.
---

# Add Entity

FSD 아키텍처 규칙에 맞춰 `src/entities/` 아래에 새 도메인 Entity를 추가합니다.

## TRIGGER

- 새 entity 추가, 새 도메인 모델 생성, 새 FSD 슬라이스 추가 요청 시 이 절차를 따른다.

## SKIP

- 기존 entity를 수정하는 경우.
- entity 구조에 대해 질문만 하는 경우.

## ⚠️ entity는 DB를 모른다

**`api.ts`에서 `@server/db`를 import하지 않는다.** entity는 UI 레이어이므로 DB에 직접 닿을 수 없다.
데이터가 필요하면 **API 라우트를 HTTP로 부르는 클라이언트 fetcher**를 둔다.

```
클라이언트(react-query) → entities/*/api.ts → API 라우트 → server/queries → DB
```

`server/`를 import할 수 있는 곳은 **API 라우트(`src/app/api/**`)와 서버 컴포넌트\*\*뿐이다.

## 파일 구성

| 파일                 | 역할                                                                         | 필수              |
| -------------------- | ---------------------------------------------------------------------------- | ----------------- |
| `model.ts`           | 도메인 타입. Prisma 모델이 아니라 **UI가 쓰는 형태**(`Date` → ISO 문자열 등) | ✅                |
| `lib.ts`             | **row → DTO 매핑.** API 라우트·서버 컴포넌트가 부른다                        | 조회가 있으면     |
| `api.ts`             | **클라이언트 fetcher.** `fetch`로 API 라우트 호출. 파라미터만 실어 보낸다    | 클라이언트가 쓰면 |
| `ui/<Component>.tsx` | props만 받는 dumb 컴포넌트. 상태·fetch 금지                                  | UI가 있으면       |
| `index.ts`           | 공개 API 배럴. 내부 구현은 노출하지 않는다                                   | ✅                |

## 절차

1. `src/entities/$ARGUMENTS/` 디렉토리를 만든다.
2. **`model.ts`** — 도메인 타입. `Date`는 ISO 문자열로 둔다(직렬화 경계를 넘나들기 때문).
3. **`lib.ts`** — Prisma row를 DTO로 바꾸는 순수 함수. 권한 판정처럼 **서버만 아는 것은 여기서
   계산해 DTO에 실어 내린다**(예: `comment.canDelete`).
4. **`api.ts`** — 클라이언트 fetcher. 응답이 `!ok`면 우리말 메시지로 throw 한다.
5. **`ui/<Component>.tsx`** — props만 받는다. 스타일은 `/add-styled-ui` 스킬을 따른다.
6. **`index.ts`** — 타입과 함수를 골라 re-export.
7. 필요하면 `server/queries/<name>.ts`(순수 Prisma)와 API 라우트를 함께 만든다.

## 규칙

- **entity가 다른 entity를 import하지 않는다**(cross-entity 금지).
  예외: `entities/cluster/model.ts`가 `OutletMetadata` 타입만 참조하는 것은 허용.
- 캐시가 필요하면 **DTO 경계**(API 라우트·서버 컴포넌트)에 건다. `server/queries`에 걸면
  `unstable_cache`의 JSON 직렬화로 `Date`가 문자열이 되어 매핑이 깨진다.
  → `docs/agent/caching.md`

## 참고할 기존 entity

- `cluster` — model·lib·api·ui 전부 갖춘 표준형
- `comment` — `lib.ts`에서 서버가 `canDelete`를 계산해 내리는 예
- `article` — 타입만 있는 최소형(UI·fetcher 없음)

## 완료 확인

- `npx tsc --noEmit`
- `api.ts`에 `@server/` import가 없는지 확인한다.
