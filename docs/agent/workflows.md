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

## 브랜치 전략 & 배포

**GitHub Flow.** `develop` 없이 `main` 하나만 장수(long-lived) 브랜치로 둔다. `main` = 프로덕션(라이브).

- `main`에는 **직접 push하지 않는다.** 모든 변경은 `feat/*`·`fix/*`·`chore/*`·`docs/*` 브랜치에서 PR로 들어온다.
- PR을 열면 두 게이트가 돈다.
  - **`ci.yml`** — `main` 대상 push·PR에서 `tsc --noEmit` · `lint` · 단위 테스트. (⚠️ `next build`는 하지 않음)
  - **Vercel Preview** — 브랜치별 프리뷰 배포. `next build`가 실제로 도는 곳이라 **사실상의 빌드 게이트**. 프리뷰 URL은 Deployment Protection(로그인벽)이 걸려 소유자만 접근한다.
- 검증되면 **squash merge** → `main` push → Vercel Production 자동 배포 = 라이브 반영.
- `pipeline.yml`(collect+ingest)은 cron(6시간마다)·수동 트리거라 브랜치와 무관하게 항상 기본 브랜치(`main`)에서 돈다. 브랜치 작업이 프로덕션 수집에 영향을 주지 않는다.

## 워크트리로 작업하기

작업 하나 = 워크트리 하나 = 브랜치 하나. `main` 원본 클론은 직접 커밋하지 않고 항상 clean하게 둔다.

```bash
# 1. 형제 디렉토리에 워크트리 + 브랜치 동시 생성
git worktree add ../confirmationbias-<slug> -b feat/<slug>
cd ../confirmationbias-<slug>

# 2. 새 워크트리엔 node_modules·.env가 없다 (둘 다 gitignore)
cp ../confirmation-bias/.env .env    # 로컬 dev·파이프라인 실행이 필요할 때
npm ci
npm run db:generate                  # Prisma 클라이언트 생성 (src/generated/prisma)

# 3. 작업 → 커밋 → push → PR
git push -u origin feat/<slug>
gh pr create --base main

# 4. merge 후 정리
git worktree remove ../confirmationbias-<slug>
git branch -d feat/<slug>
```

- **문서만 바꾸는 워크트리**는 `npm ci`·`.env` 없이 마크다운만 편집해도 된다(빌드·실행이 없으므로).
- 커밋·push는 diff를 확인한 뒤 수행한다.
