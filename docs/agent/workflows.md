# Workflows

## 뉴스 수집 → 클러스터링 파이프라인

```bash
# 1. RSS 수집 (data/new-articles.json 에 저장)
npm run collect

# 2. 임베딩 + 클러스터 배정 + DB upsert
npm run ingest

# 둘을 이어서
npm run collect && npm run ingest
```

`.env`에 `OPENAI_API_KEY`, `DATABASE_URL`(+ `DIRECT_URL`) 필요.

## DB 초기화 (처음 셋업)

```bash
npm run db:push      # 스키마를 Supabase에 반영 (DIRECT_URL 사용)
npm run db:seed      # Outlet 15개 시드
```

스키마 변경 후에도 `db:push` → 재실행.

## 새 언론사(Outlet) 추가

1. `src/entities/outlet/model.ts`의 `OUTLETS` 배열에 항목 추가
2. `npm run db:seed` 재실행 (upsert라 기존 데이터 안전)

## 새 FSD Entity 추가

1. `src/entities/<name>/` 디렉토리 생성
2. `model.ts` — 타입 정의
3. `api.ts` — 서버 전용 DB 쿼리 (필요한 경우)
4. `ui/<Component>.tsx` — dumb 표시 컴포넌트 (필요한 경우)
5. `index.ts` — 공개 API만 re-export

## 개발 서버

```bash
npm run dev          # localhost:3000
```

## 테스트

```bash
npm run test:unit -- --run    # 단위 테스트 (watch 없이 1회)
npm run test:unit             # 단위 테스트 watch 모드
npm run test:e2e              # E2E (dev 서버 미리 실행 필요)
```

## 타입 체크 / 린트

```bash
npx tsc --noEmit
npm run lint
npm run format:check
```
