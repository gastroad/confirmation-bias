# DB 마이그레이션: SQLite → Postgres (Supabase)

`launch-todo.md` P0 항목 **"SQLite → 원격 DB 마이그레이션"**의 실행 계획.
원래 계획은 Turso였으나, 포트폴리오 가치·생태계·기존 MySQL 경험 전이를 고려해
**Supabase(Postgres)** 로 결정.

## 사전 확인 결과 (결합도 낮음)

- 모든 DB 접근이 Prisma 타입 API(`db.cluster.findMany` 등)로만 이루어짐. 앱 코드에 raw SQL 없음.
- 임베딩/유사도 계산은 전부 앱 코드에서 JSON 문자열로 처리 → `pgvector` 등 DB 특수기능 의존 없음.
- DB에 묶인 곳은 두 군데뿐: `server/db.ts`(어댑터), `prisma/schema.prisma`(`provider`).
- **Prisma를 쓰므로 쿼리 코드는 한 줄도 안 바뀜.** 바뀌는 건 어댑터·provider·연결 문자열뿐.

## 버전 사실

- `prisma` / `@prisma/client` : **7.8.0**
- 현재 어댑터 : `@prisma/adapter-libsql@7.8.0`
- 전환 후 어댑터 : `@prisma/adapter-pg@7.8.0` (npm registry에 동일 버전 존재 확인됨)

---

## 작업 순서

### 1단계 — Supabase 프로젝트 생성 (사용자가 직접)

> 외부 계정/콘솔 작업이라 코드로 대신할 수 없음.

1. https://supabase.com 가입 → **New project** 생성
2. DB 비밀번호 설정 (분실 주의)
3. 프로젝트 생성 후 **Project Settings → Database → Connection string** 에서 두 가지 확보:
   - **Pooled (Transaction, port 6543)** — 앱 런타임용 (`DATABASE_URL`)
   - **Direct (Session, port 5432)** — 마이그레이션/스키마 push용 (`DIRECT_URL`)
4. 두 문자열을 `.env`에 기록:

   ```
   DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://...@...supabase.com:5432/postgres"
   ```

> ⚠️ Supabase는 pooler(6543)와 direct(5432)를 구분함. Prisma `db push`/`migrate`는
> direct 연결을 써야 하고, 앱 런타임은 pooler를 쓰는 게 권장.

### 2단계 — 의존성 교체 (코드 작업)

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
npm uninstall @prisma/adapter-libsql @libsql/client
```

### 3단계 — `prisma/schema.prisma` 수정

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- 모델 정의(`Outlet` / `Cluster` / `Article`)는 그대로 둬도 Postgres 호환.
- `embeddingJson` / `centroidJson` 은 `String?` 유지 (Postgres `text`로 매핑). 변경 불필요.
  - (선택) 나중에 `Json` 타입이나 `pgvector`로 고도화 가능 — 지금은 보류.

### 4단계 — `server/db.ts` 어댑터 교체

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}
// 이하 싱글턴 로직 동일
```

> 정확한 `PrismaPg` 생성자 시그니처는 `node_modules/@prisma/adapter-pg/README.md` 에서
> 최종 확인 후 작성 (Prisma v7 기준 — 추측 금지).

### 5단계 — `prisma.config.ts` 점검

- 현재 `datasource.url = process.env["DATABASE_URL"]`. directUrl 분리 시 마이그레이션 경로가
  direct를 타도록 설정 확인 필요.

### 6단계 — 스키마 반영 + 시드

```bash
npm run db:generate
npm run db:push      # Supabase에 테이블 생성
npm run db:seed      # Outlet 15개 시드
```

### 7단계 — 검증

```bash
npm run collect && npm run ingest   # 파이프라인이 원격 DB에 적재되는지
npm run dev                          # 대시보드가 원격 DB에서 조회되는지
npm run test:unit -- --run           # 단위 테스트 회귀 확인
npx tsc --noEmit                     # 타입 회귀 확인
```

---

## 롤백 플랜

- `.env`의 `DATABASE_URL`만 `file:./dev.db`로 되돌리고 어댑터/ provider를 libsql/sqlite로
  복구하면 로컬 SQLite로 즉시 복귀 가능.
- 작업 전 `dev.db` 백업 권장.

## 후속 (이 문서 범위 밖, launch-todo.md 참조)

- 시크릿을 호스팅 환경변수로 이전 (P0)
- CI e2e job 재활성화 (P1) — 이제 원격 DB가 생겼으니 가능
- 인덱스 추가 (P1) — Postgres 전환과 함께 `@@index` 검토하면 효율적

---

## 체크리스트 — ✅ 완료(2026-06-29)

- [x] 1. Supabase 프로젝트 생성 + 연결 문자열 2종 확보 (사용자)
- [x] 2. `@prisma/adapter-pg` / `pg` / `@types/pg` 설치, libsql 제거
- [x] 3. `schema.prisma` provider → postgresql
- [x] 4. `server/db.ts` 어댑터 교체 (`PrismaPg`, `DATABASE_URL` pooler)
- [x] 5. `prisma.config.ts` → CLI용 url을 `DIRECT_URL`로 변경
- [x] 6. `db:generate` → `db:push` → `db:seed`
- [x] 7. 파이프라인·대시보드·테스트 검증

> 문서가 못 잡았던 추가 작업: `prisma/seed.ts`가 libsql 어댑터를 자체 생성하고 있어
> `../server/db` 싱글턴 재사용으로 교체. 연결 실패 원인은 비밀번호의 `[...]` 대괄호 잔존(P1000)이었음.
