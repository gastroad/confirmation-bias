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

## 절차

1. `src/entities/$ARGUMENTS/` 디렉토리를 생성합니다.
2. **`model.ts`** — 도메인 타입을 정의합니다. Prisma 모델을 참고하되 UI에 필요한 형태로 변환합니다.
3. **`api.ts`** — DB 조회가 필요한 경우에만 작성합니다. `@server/db`를 import하는 서버 전용 파일입니다.
4. **`ui/<ComponentName>.tsx`** — props만 받는 dumb 컴포넌트. 상태 관리·fetch 금지.
5. **`index.ts`** — 외부에 공개할 것만 re-export합니다. 내부 구현은 노출하지 않습니다.

## 완료 확인

- `npx tsc --noEmit`으로 타입 오류가 없는지 확인합니다.
