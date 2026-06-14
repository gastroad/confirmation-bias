# Architecture

## 전체 데이터 흐름

```
RSS 피드
  └─▶ scripts/collect.ts       — 피드 파싱, data/new-articles.json 에 임시 저장
        └─▶ scripts/ingest.ts  — 임베딩 생성 → 클러스터 배정 → DB upsert
              └─▶ SQLite (dev.db / Turso)
                    └─▶ Next.js App (src/)  — Server Component가 직접 DB 조회
```

## 디렉토리 역할

| 경로                              | 역할                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `server/db.ts`                    | Prisma 싱글턴. 전체 BE에서 이것만 import               |
| `server/clustering/embed.ts`      | OpenAI text-embedding-3-small 호출 (5-retry, 431 방어) |
| `server/clustering/similarity.ts` | 코사인 유사도 순수 함수                                |
| `server/clustering/cluster.ts`    | 클러스터 배정 로직 (임계값 0.85/0.70)                  |
| `server/clustering/llm-judge.ts`  | 0.70~0.85 구간 LLM 판정                                |
| `scripts/collect.ts`              | RSS 수집 → `data/new-articles.json`                    |
| `scripts/ingest.ts`               | `new-articles.json` → DB                               |
| `prisma/schema.prisma`            | Outlet / Cluster / Article 모델                        |
| `src/`                            | FSD 구조 Next.js 앱 (아래 별도 설명)                   |

## FSD 레이어 (src/)

```
shared/          — 프레임워크 무관 유틸 (format.ts 등)
entities/        — 도메인 모델 + dumb UI
  outlet/        — model.ts, ui/, index.ts
  article/       — model.ts, index.ts
  cluster/       — model.ts, api.ts(서버 전용), ui/, index.ts
widgets/         — 페이지 조각 (여러 entity 조합)
  cluster-feed/
  cluster-detail/
app/             — Next.js App Router (page.tsx, layout.tsx, API routes)
```

**레이어 의존 방향:** `app → widgets → entities → shared` (단방향)

- `entities/cluster/api.ts` 만 예외적으로 `@server/db` import 허용 (서버 전용 파일)
- `features/` 레이어는 사용자 인터랙션(필터, 정렬 등)이 생기면 그때 추가
