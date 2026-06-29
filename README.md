# 🗞️ confirmation-bias

> 같은 뉴스 이슈를 언론사별로 그룹핑하고, 매체 성향별 보도 비중을 시각화하는 뉴스 분석 대시보드

**🔗 라이브: [confirmationbias.app](https://confirmationbias.app/)**

한국 주요 언론사 15곳의 RSS를 수집해 **임베딩 기반으로 같은 이슈를 자동 클러스터링**하고,
각 이슈가 진보·중도·보수 매체에서 어떤 비중으로 다뤄지는지 한눈에 보여줍니다.
같은 사건을 두고 진영별로 얼마나 다르게 — 혹은 비슷하게 — 보도하는지 관찰할 수 있습니다.

---

## ✨ 주요 기능

- **🔗 이슈 클러스터링** — OpenAI 임베딩 + 코사인 유사도로 동일 이슈 기사를 자동 그룹핑 (애매한 구간은 LLM이 판정)
- **📊 성향별 보도 비중** — 클러스터마다 진보/중도/보수 매체의 보도 분포를 막대그래프로 시각화
- **📈 타임라인** — 이슈가 시간에 따라 어떻게 확산되었는지 추적
- **🏷️ 15개 언론사 분류** — 조선·중앙·동아부터 한겨레·경향·프레시안까지 5단계 성향 라벨링

## 🛠️ 기술 스택

| 영역     | 사용 기술                                                                 |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, react-query, vanilla-extract, Recharts |
| Backend  | Node.js 파이프라인 (RSS 수집 → 임베딩 → 클러스터링)                       |
| AI       | OpenAI `text-embedding-3-small`                                           |
| Database | Supabase(Postgres) + Prisma 7 (`@prisma/adapter-pg`)                      |
| Hosting  | Vercel (Hobby) — Next.js 서빙                                             |
| 자동화   | GitHub Actions — CI + 매시간 수집 파이프라인(collect→ingest)              |
| Tooling  | TypeScript, Vitest, Playwright, ESLint, Prettier                          |
| Arch     | FSD (Feature-Sliced Design)                                               |

## 🧭 아키텍처

```
RSS 피드
  └─▶ scripts/collect.ts       RSS 파싱 → data/new-articles.json
        └─▶ scripts/ingest.ts  임베딩 생성 → 클러스터 배정 → DB upsert
              └─▶ Postgres @ Supabase (Prisma)
                    └─▶ server/queries  순수 Prisma 조회 (커서 페이지네이션·집계)
                          └─▶ API 라우트  파라미터 파싱 + 도메인 매핑 → JSON
                                └─▶ 클라이언트 (react-query)  무한 스크롤 피드
```

**클러스터 배정 로직** — 코사인 유사도 기준:

- `≥ 0.85` → 기존 클러스터에 즉시 합류
- `0.70 ~ 0.85` → LLM이 같은 이슈인지 판정
- `< 0.70` → 새 클러스터 생성

디렉토리 구조와 FSD 레이어 규칙은 [`docs/agent/architecture.md`](docs/agent/architecture.md)를 참고하세요.

## 🌐 운영 / 인프라

4개 외부 서비스로 구성된 실서비스. **Supabase를 사이에 두고 쓰기(파이프라인)와 읽기(웹)가 분리**된다.

```
   GitHub Actions  ──write──▶  Supabase (Postgres)  ◀──read──  Vercel (웹)
   매시간 collect→ingest          단일 진실 공급원              방문자 대시보드
        │
   OpenAI (임베딩/판정)
```

| 서비스       | 역할                                         |
| ------------ | -------------------------------------------- |
| **Vercel**   | Next.js 웹 호스팅 (Supabase 읽기만)          |
| **Supabase** | Postgres DB (단일 진실 공급원)               |
| **GitHub**   | 저장소 + Actions (CI · 매시간 파이프라인)    |
| **OpenAI**   | 임베딩 + LLM 클러스터 판정 (파이프라인 전용) |

계정·시크릿·점검 지점 등 운영 상세는 [`docs/agent/external-services.md`](docs/agent/external-services.md)를 참고하세요.

## 🚀 시작하기

### 1. 환경 변수

프로젝트 루트에 `.env` 파일을 만듭니다.

```env
# Supabase 연결 문자열 (Connect → ORMs → Prisma 에서 복사)
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true  # 앱 런타임(pooler)
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres                    # 스키마 push/마이그레이션(direct)
OPENAI_API_KEY=sk-...
```

### 2. 의존성 설치 & DB 초기화

```bash
npm install
npm run db:push      # 스키마를 Supabase에 반영
npm run db:seed      # 언론사 15개 시드
```

### 3. 뉴스 수집 → 클러스터링

```bash
npm run collect      # RSS 수집 → data/new-articles.json
npm run ingest       # 임베딩 + 클러스터 배정 + DB 저장
# 또는 한 번에
npm run collect && npm run ingest
```

### 4. 개발 서버 실행

```bash
npm run dev          # http://localhost:3000
```

## 📜 npm 스크립트

| 스크립트                      | 설명                          |
| ----------------------------- | ----------------------------- |
| `npm run dev`                 | 개발 서버 (localhost:3000)    |
| `npm run build` / `start`     | 프로덕션 빌드 / 실행          |
| `npm run collect`             | RSS 수집                      |
| `npm run ingest`              | 임베딩 + 클러스터링 + DB 저장 |
| `npm run db:push` / `db:seed` | 스키마 반영 / 언론사 시드     |
| `npm run test:unit`           | 단위 테스트 (Vitest)          |
| `npm run test:e2e`            | E2E 테스트 (Playwright)       |
| `npm run lint`                | ESLint                        |
| `npm run format`              | Prettier 포맷팅               |

## 🧪 테스트

```bash
npm run test:unit -- --run   # 단위 테스트 1회 실행
npm run test:e2e             # E2E (dev 서버 미리 실행 필요)
```

## 📁 프로젝트 구조

```
confirmation-bias/
├── server/            BE (DB · 클러스터링 · 조회 쿼리)
│   ├── db.ts          Prisma 싱글턴
│   ├── queries/       순수 Prisma 조회 (커서 페이지네이션·집계)
│   └── clustering/    embed · similarity · cluster · llm-judge
├── scripts/           collect.ts · ingest.ts (매시간 GitHub Actions 실행)
├── prisma/            schema.prisma · seed.ts
├── src/               Next.js 앱 (FSD 구조)
│   ├── app/           App Router (page · layout · API routes · providers)
│   ├── widgets/       cluster-feed · cluster-detail
│   ├── features/      theme-toggle · outlet-filter (상태·인터랙션)
│   ├── entities/      outlet · article · cluster (model · lib · api · ui)
│   └── shared/        프레임워크 무관 유틸 · 스타일(vanilla-extract)
├── e2e/               Playwright 테스트
└── docs/agent/        아키텍처 · 컨벤션 · 워크플로 문서
```

데이터 흐름은 **클라이언트(react-query) → API 라우트 → `server/queries` → DB**로,
UI 레이어는 DB에 직접 접근하지 않고 `entities/*/api.ts` 클라이언트 fetcher로 호출합니다.

## 📰 분류 대상 언론사

| 성향     | 언론사                                    |
| -------- | ----------------------------------------- |
| 보수     | 조선일보, 세계일보, 천지일보              |
| 중도보수 | 중앙일보, 동아일보                        |
| 중도     | 연합뉴스, 뉴시스, 서울신문, 시사저널, KBS |
| 중도진보 | 경향신문                                  |
| 진보     | 한겨레신문, 시사인, 프레시안, 여성신문    |

> 성향 분류는 미디어 연구를 참고한 상대적 위치 표시이며, 절대적 기준이 아닙니다.

---

<sub>포트폴리오 / 학습 목적 프로젝트입니다.</sub>
