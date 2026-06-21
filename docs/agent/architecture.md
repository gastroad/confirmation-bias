# Architecture

## 전체 데이터 흐름

```
RSS 피드
  └─▶ scripts/collect.ts       — 피드 파싱, data/new-articles.json 에 임시 저장
        └─▶ scripts/ingest.ts  — 임베딩 생성 → 클러스터 배정 → DB upsert
              └─▶ SQLite (dev.db / Turso)
                    └─▶ server/queries/*  — 순수 Prisma 조회 (커서 페이지네이션/집계)
                          └─▶ API 라우트 (src/app/api/**)  — 파라미터 파싱 + 도메인 매핑
                                └─▶ 클라이언트 (react-query)  — 무한 스크롤 피드 / 상세는 서버 컴포넌트가 server/queries 직접 호출
```

## 디렉토리 역할

| 경로                              | 역할                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `server/db.ts`                    | Prisma 싱글턴. 전체 BE에서 이것만 import                |
| `server/queries/clusters.ts`      | 클러스터 조회(커서 페이지네이션·상세·집계). 순수 Prisma |
| `server/clustering/embed.ts`      | OpenAI text-embedding-3-small 호출 (5-retry, 431 방어)  |
| `server/clustering/similarity.ts` | 코사인 유사도 순수 함수                                 |
| `server/clustering/cluster.ts`    | 클러스터 배정 로직 (임계값 0.85/0.70)                   |
| `server/clustering/llm-judge.ts`  | 0.70~0.85 구간 LLM 판정                                 |
| `scripts/collect.ts`              | RSS 수집 → `data/new-articles.json`                     |
| `scripts/ingest.ts`               | `new-articles.json` → DB                                |
| `prisma/schema.prisma`            | Outlet / Cluster / Article 모델                         |
| `src/`                            | FSD 구조 Next.js 앱 (아래 별도 설명)                    |

## FSD 레이어 (src/)

```
shared/          — 프레임워크 무관 유틸 / 스타일
  lib/           — format.ts 등
  styles/        — theme.css.ts(토큰·라이트/다크), layout.css.ts
entities/        — 도메인 모델 + dumb UI
  outlet/        — model.ts, ui/, index.ts
  article/       — model.ts, index.ts
  cluster/       — model.ts, lib.ts(row→DTO 매핑), api.ts(클라이언트 fetcher), ui/, index.ts
features/        — 사용자 인터랙션 (상태 가능)
  theme-toggle/  — model.ts, ui/(ThemeToggle, ThemeScript), index.ts
widgets/         — 페이지 조각 (여러 entity 조합)
  cluster-feed/
  cluster-detail/
app/             — Next.js App Router (page.tsx, layout.tsx, API routes)
```

**레이어 의존 방향:** `app → widgets → features → entities → shared` (단방향)

- `server/` import는 API 라우트(`src/app/api/**`)와 서버 컴포넌트만. entities/widgets/features는 `entities/*/api.ts` 클라이언트 fetcher로 HTTP 호출 (DB 직접 접근 금지)
- `features/`는 상태·인터랙션 허용(entities의 `ui/` dumb 규칙과 다름). 필터·정렬 등도 여기에 추가
