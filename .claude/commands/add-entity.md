FSD 규칙에 따라 새 Entity를 추가합니다.

다음 절차를 따르세요:

1. `src/entities/$ARGUMENTS/` 디렉토리를 생성합니다.
2. `model.ts` — 도메인 타입을 정의합니다. Prisma 모델을 참고하되, UI에 필요한 형태로 변환합니다.
3. `api.ts` — DB 조회가 필요한 경우 작성합니다. `@server/db`를 import하며, 이 파일은 서버 전용입니다.
4. `ui/<ComponentName>.tsx` — props만 받는 dumb 컴포넌트. 상태 관리나 fetch 금지.
5. `index.ts` — 외부에 공개할 것만 re-export합니다. 내부 구현은 노출하지 않습니다.

완료 후 `npx tsc --noEmit`으로 타입 오류가 없는지 확인합니다.
