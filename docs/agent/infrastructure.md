# Infrastructure

## 현재 상태

| 항목   | 현재 값                                    |
| ------ | ------------------------------------------ |
| DB     | Supabase (Postgres), region ap-northeast-2 |
| ORM    | Prisma v7 + `@prisma/adapter-pg`           |
| 임베딩 | OpenAI `text-embedding-3-small`, 512차원   |
| 호스팅 | Vercel (Hobby) — Next.js 서빙만 담당       |

> SQLite → Supabase 전환 완료(2026-06-29). 롤백용 `dev.db.bak-*`는 로컬에만 보관(gitignore).

## 환경변수 (`.env`)

```
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true  # 앱 런타임(pooler)
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres                    # 스키마 push/migrate(direct)
OPENAI_API_KEY=sk-...
```

- **`DATABASE_URL`(6543, pgbouncer)** — 앱 런타임. `server/db.ts`의 `PrismaPg` 어댑터가 사용.
- **`DIRECT_URL`(5432, session)** — `prisma db push`/migrate용. pgbouncer 트랜잭션 풀러로는 DDL이 깨져
  `prisma.config.ts`가 이쪽을 가리킨다.
- Supabase Connect → ORMs → Prisma 에서 두 문자열을 복사. 비밀번호 자리(`[YOUR-PASSWORD]`)의
  **대괄호까지 함께 치환**해야 함(대괄호 잔존 시 P1000 인증 실패).

`scripts/`와 `prisma/` 스크립트는 `--env-file=.env` 로 로드.  
Next.js는 자동으로 `.env` 로드.

### Vercel(웹 호스트)에 필요한 시크릿

- **`DATABASE_URL`만 필요.** OpenAI는 `server/clustering/*`(embed·llm-judge)에서만 쓰이고
  이는 ingest 파이프라인(GitHub Actions)만 import하므로, 웹 런타임엔 `OPENAI_API_KEY` 불필요.
- **`DIRECT_URL`도 Vercel엔 불필요.** 마이그레이션은 GitHub Actions/로컬에서만 수행.

## Prisma 주의사항

- 생성된 클라이언트는 `src/generated/prisma/` (gitignore됨)
- 코드 변경 후 반드시 `npm run db:generate` 실행 (CI에서도 자동 실행됨)
- **Vercel 빌드는 스텝을 못 끼우므로 `build` 스크립트가 `prisma generate && next build`.**
  생성물이 gitignore라 이게 없으면 클라이언트 부재로 빌드 실패.
- 스키마 파일: `prisma/schema.prisma`
- Prisma 런타임 설정: `prisma.config.ts` (CLI용 datasource URL = `DIRECT_URL` 주입)

## 향후 인프라 계획 (미완료)

### RSS 자동 수집 스케줄

- cron 또는 GitHub Actions scheduled workflow로 `collect && ingest` 자동 실행 예정
- `data/new-articles.json`은 임시 중간 파일. 향후 DB 직접 append로 대체 예정

### 중복 뉴스 제거

- 현재: URL 기준 `upsert`로 기본 중복 방지
- 향후: 임베딩 유사도 기반 cross-outlet 중복 감지 추가 예정
