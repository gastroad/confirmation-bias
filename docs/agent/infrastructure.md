# Infrastructure

## 현재 상태 (로컬 개발)

| 항목   | 현재 값                                  |
| ------ | ---------------------------------------- |
| DB     | SQLite (`dev.db`, 프로젝트 루트)         |
| ORM    | Prisma v7 + `@prisma/adapter-libsql`     |
| 임베딩 | OpenAI `text-embedding-3-small`, 512차원 |
| 호스팅 | 없음 (로컬 전용)                         |

## 환경변수 (`.env`)

```
DATABASE_URL=file:./dev.db
OPENAI_API_KEY=sk-...
```

`scripts/`와 `prisma/` 스크립트는 `--env-file=.env` 로 로드.  
Next.js는 자동으로 `.env` 로드.

## Prisma 주의사항

- 생성된 클라이언트는 `src/generated/prisma/` (gitignore됨)
- 코드 변경 후 반드시 `npm run db:generate` 실행 (CI에서도 자동 실행됨)
- 스키마 파일: `prisma/schema.prisma`
- Prisma 런타임 설정: `prisma.config.ts` (datasource URL을 여기서 주입)

## 향후 인프라 계획 (미완료)

### 원격 DB (Turso)

- SQLite → Turso(libsql 호환) 전환 예정
- `DATABASE_URL`을 Turso URL로 교체하면 코드 변경 없이 동작
- CI e2e job은 Turso 연결 후 재활성화

### RSS 자동 수집 스케줄

- cron 또는 GitHub Actions scheduled workflow로 `collect && ingest` 자동 실행 예정
- `data/new-articles.json`은 임시 중간 파일. 향후 DB 직접 append로 대체 예정

### 중복 뉴스 제거

- 현재: URL 기준 `upsert`로 기본 중복 방지
- 향후: 임베딩 유사도 기반 cross-outlet 중복 감지 추가 예정
