# Workflows

## 뉴스 수집 → 클러스터링 파이프라인

수집과 클러스터링은 **분리**되어 있다(주기가 다르다).

```bash
# 1. RSS 수집 → Article 직접 적재. 임베딩하지 않으므로 OPENAI_API_KEY 불필요
npm run collect

# 2. KST 하루치를 통째로 클러스터링. 멱등하므로 몇 번 돌려도 결과가 같다
npm run cluster:day                                    # 어제(KST)
npm run cluster:day -- --date=2026-08-23
npm run cluster:day -- --from=2026-06-01 --to=2026-08-23
npm run cluster:day -- --all                           # 기사가 존재하는 모든 날짜
npm run cluster:day -- --date=2026-08-20 --dry-run --threshold=0.65   # 임계값 튜닝
```

`.env`에 `OPENAI_API_KEY`, `DATABASE_URL`(+ `DIRECT_URL`) 필요.
설계·임계값 근거는 [daily-clustering.md](./daily-clustering.md).

```bash
# 3. RSS pubDate 이상치로 생긴 과거 버킷 정리 (일회성). 먼저 --dry-run으로 대상을 본다
npm run cleanup:dates -- --dry-run
npm run cleanup:dates
```

댓글이 달린 클러스터가 대상에 있으면 **지우지 않고 중단한다**(Comment는 ON DELETE CASCADE라
사람이 판단해야 한다). 수집 단계의 재발 방지는 `scripts/collect.ts`의 `MAX_PAST_DAYS`가 맡는다.

```bash
# 4. 기존 클러스터에 요약 문장 백필. 문장 규칙을 고친 뒤 전체에 반영할 때도 이걸 쓴다
npm run backfill:summary -- --dry-run          # 쓰지 않고 표본만
npm run backfill:summary                       # 전체 재생성
npm run backfill:summary -- --missing-only     # summary가 비어 있는 것만
```

⚠️ **백필에 `cluster:day --all`을 쓰지 않는다.** `clusterDay`는 그 날짜의 클러스터를 지우고
**새 id로 재생성**하므로 1만여 개 URL이 전부 바뀌고 이미 색인된 URL이 전량 404가 된다.
`backfill:summary`는 클러스터를 건드리지 않고 `summary`만 UPDATE한다.

## DB 초기화 (처음 셋업)

```bash
npm run db:migrate   # 마이그레이션 적용 (DIRECT_URL 사용)
npm run db:seed      # Outlet 15개 시드
```

**스키마 변경은 `db:push`가 아니라 마이그레이션으로 한다**(2026-08-24 전환).

```bash
# 1. prisma/schema.prisma 수정 후 SQL 생성
mkdir -p prisma/migrations/<YYYYMMDD>_<name>
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script \
  2>/dev/null > prisma/migrations/<YYYYMMDD>_<name>/migration.sql

# 2. 데이터 이관이 필요하면 그 SQL을 손으로 끼워 넣는다
# 3. 적용
npm run db:migrate && npm run db:generate
```

- `migrate diff`의 로그가 stdout에 섞이므로 **`2>/dev/null`을 반드시 붙인다**(안 붙이면
  "Loaded Prisma config…"가 SQL 첫 줄로 들어가 syntax error).
- 실패한 마이그레이션은 `npx prisma migrate resolve --rolled-back <name>` 후 재시도.
- **자동 적용은 없다.** 배포 파이프라인에 마이그레이션 스텝이 없으므로 로컬에서 수행한 뒤
  코드를 머지한다(pooled 연결로는 Prisma의 advisory lock이 깨져 `DIRECT_URL`이 필요하다).

## 관리자 계정 만들기

회원가입은 누구나 할 수 있고, 관리자만 `/admin`(수집·클러스터링 수동 트리거)에 접근한다.

```bash
# 1. /auth/sign-up 에서 가입한 뒤
npm run grant:admin -- you@example.com
# 2. 이미 로그인 중이라면 다시 로그인해야 세션에 반영된다
```

`auth.admin.setRole()`은 호출자가 이미 admin이어야 해서 최초 1명은 이 스크립트로 만든다.
→ [auth.md](./auth.md)

## 새 언론사(Outlet) 추가

1. **피드가 살아 있는지 먼저 확인** — 응답 여부가 아니라 최신 기사 날짜를 본다
2. `src/entities/outlet/model.ts`의 `OUTLETS` 배열에 항목 추가 (성향 균형 고려)
3. `scripts/feed_specs.json`의 `politics`에 추가
4. `npm run db:seed` 재실행 — upsert이며, 목록에서 빠진 **기사 0건짜리** 언론사는 정리된다

→ 점검 방법과 알려진 죽은 피드는 [rss-feeds.md](./rss-feeds.md)

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
- `collect.yml`(3시간마다)·`cluster-daily.yml`(KST 05:00)은 cron·수동 트리거라 브랜치와 무관하게 항상 기본 브랜치(`main`)에서 돈다. 브랜치 작업이 프로덕션 수집에 영향을 주지 않는다.

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
