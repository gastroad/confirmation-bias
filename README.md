# 🗞️ confirmation-bias

> 같은 뉴스 이슈를 언론사별로 그룹핑하고, 매체 성향별 보도 비중을 시각화하는 뉴스 분석 대시보드

**🔗 라이브: [confirmationbias.app](https://confirmationbias.app/)**

한국 주요 언론사 15곳의 RSS를 수집해 **임베딩 기반으로 같은 이슈를 자동 클러스터링**하고,
각 이슈가 진보·중도·보수 매체에서 어떤 비중으로 다뤄지는지 한눈에 보여줍니다.
같은 사건을 두고 진영별로 얼마나 다르게 — 혹은 비슷하게 — 보도하는지 관찰할 수 있습니다.

---

## ✨ 주요 기능

- **🔗 이슈 클러스터링** — OpenAI 임베딩 기반 응집 클러스터링(HAC)으로 동일 이슈 기사를 자동 그룹핑
- **📊 성향별 보도 비중** — 클러스터마다 진보/중도/보수 매체의 보도 분포를 막대그래프로 시각화
- **📅 날짜별 보기** — 하루 단위로 그날의 이슈를 모아 보고, 앞뒤 날짜로 이동
- **📈 타임라인** — 이슈가 시간에 따라 어떻게 확산되었는지 추적
- **🏷️ 17개 언론사 분류** — 조선·동아·한국경제부터 한겨레·경향·오마이뉴스까지 5단계 성향 라벨링
- **💬 댓글** — 회원이 이슈별로 의견을 남길 수 있습니다

## 🛠️ 기술 스택

| 영역     | 사용 기술                                                                 |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, react-query, vanilla-extract, Recharts |
| Backend  | Node.js 파이프라인 (RSS 수집 → 임베딩 → 클러스터링)                       |
| AI       | OpenAI `text-embedding-3-small`                                           |
| Database | Neon(Postgres 18) + Prisma 7 (`@prisma/adapter-pg`)                       |
| Auth     | Neon Auth (Managed Better Auth) — 회원가입·로그인·role                    |
| Hosting  | Vercel (Hobby) — Next.js 서빙, 함수 리전 `sin1`                           |
| 자동화   | GitHub Actions — CI + 3시간마다 RSS 수집 + 하루 1회 배치 클러스터링       |
| 그 외    | Google AdSense(수익화) · ImprovMX(문의 메일 포워딩)                       |
| Tooling  | TypeScript, Vitest, Playwright, ESLint, Prettier                          |
| Arch     | FSD (Feature-Sliced Design)                                               |

## 🧭 아키텍처

수집과 클러스터링이 분리되어 있습니다. RSS는 항목이 빠르게 밀려 나가 자주 긁어야 하지만,
클러스터링은 하루가 닫힌 뒤 한 번만 하면 됩니다.

```
RSS 피드
  └─▶ scripts/collect.ts      3시간마다 · 피드 파싱 → Article 직접 적재
        └─▶ Postgres @ Neon (Prisma)
              ▲
  scripts/cluster-day.ts      하루 1회(KST 05:00) · 그날 기사를 통째로 다시 클러스터링
    └─ 배치 임베딩(100건/req) → 응집 클러스터링 → 트랜잭션으로 재생성 (멱등)
              │
              └─▶ server/queries  순수 Prisma 조회 (커서 페이지네이션·집계)
                    └─▶ API 라우트  파라미터 파싱 + 도메인 매핑 → JSON
                          └─▶ 클라이언트 (react-query)  무한 스크롤 피드
```

**클러스터링** — KST 하루치를 모아 **average linkage 응집 클러스터링(HAC)** 을 한 번 돌립니다.

- 클러스터링 단위는 **KST 기준 하루**이고 날짜 간 격리입니다
- 코사인 유사도 임계값 **0.62** (세 날짜 실측으로 결정)
- 같은 날짜를 몇 번 돌려도 결과가 같습니다 (**멱등**)

이전에는 기사가 도착할 때마다 기존 클러스터에 붙이는 증분 방식이었는데, 활발한 클러스터가
계속 커지며 무관한 기사까지 흡수해 **최대 253건짜리 블랙홀 클러스터**가 생겼습니다.
자세한 배경과 임계값 근거는 [`docs/agent/daily-clustering.md`](docs/agent/daily-clustering.md).

디렉토리 구조와 FSD 레이어 규칙은 [`docs/agent/architecture.md`](docs/agent/architecture.md)를 참고하세요.

## 🌐 운영 / 인프라

4개 외부 서비스로 구성된 실서비스. **DB를 사이에 두고 쓰기(파이프라인)와 읽기(웹)가 분리**된다.

```
   GitHub Actions  ──write──▶    Neon (Postgres)    ◀──read──  Vercel (웹)
   collect 3h / cluster 1d        단일 진실 공급원              방문자 대시보드
        │                       ap-southeast-1(SG)              함수 리전 sin1
   OpenAI (배치 임베딩)
```

| 서비스     | 역할                                                |
| ---------- | --------------------------------------------------- |
| **Vercel** | Next.js 웹 호스팅 (Neon 읽기만)                     |
| **Neon**   | Postgres DB (단일 진실 공급원)                      |
| **GitHub** | 저장소 + Actions (CI · 수집 3시간 · 클러스터링 1일) |
| **OpenAI** | 배치 임베딩 (클러스터링 배치 전용. 수집엔 불필요)   |

> Vercel 함수 리전(`vercel.json`의 `sin1`)은 Neon 리전과 반드시 같아야 한다.
> 어긋나면 쿼리마다 대륙을 왕복해 TTFB가 수백 ms 늘어난다.

계정·시크릿·점검 지점 등 운영 상세는 [`docs/agent/external-services.md`](docs/agent/external-services.md)를 참고하세요.

## 🚀 시작하기

### 1. 환경 변수

프로젝트 루트에 `.env` 파일을 만듭니다.

```env
# Neon 연결 문자열 (Console → Connect → 스니펫 `.env` 에서 복사)
# 두 문자열은 호스트의 `-pooler` 유무만 다르다. 값에 `&`가 있어 작은따옴표로 감싼다.
DATABASE_URL='postgresql://neondb_owner:...@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'  # 앱 런타임(pooled)
DIRECT_URL='postgresql://neondb_owner:...@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'           # 마이그레이션(direct)
OPENAI_API_KEY='sk-...'

# 인증 (Neon Console → Auth). BASE_URL은 "Auth URL"이지 JWKS URL이 아니다.
NEON_AUTH_BASE_URL='https://ep-xxxx.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth'
NEON_AUTH_COOKIE_SECRET='...'   # openssl rand -base64 32

# (선택) /admin의 수동 트리거용. 없으면 그 버튼만 실패하고 사이트는 정상.
GITHUB_DISPATCH_TOKEN=''
```

### 2. 의존성 설치 & DB 초기화

```bash
npm install
npm run db:migrate   # 마이그레이션 적용
npm run db:seed      # 언론사 17개 시드 (목록에서 빠진 기사 0건짜리는 자동 정리)
```

### 3. 뉴스 수집 → 클러스터링

```bash
npm run collect      # RSS 수집 → Article 직접 적재
npm run cluster:day  # 어제(KST) 하루치 클러스터링

# 특정 날짜 / 기간 / 전체
npm run cluster:day -- --date=2026-08-23
npm run cluster:day -- --all
```

### 4. 개발 서버 실행

```bash
npm run dev          # http://localhost:3000
```

## 📜 npm 스크립트

| 스크립트                         | 설명                          |
| -------------------------------- | ----------------------------- |
| `npm run dev`                    | 개발 서버 (localhost:3000)    |
| `npm run build` / `start`        | 프로덕션 빌드 / 실행          |
| `npm run collect`                | RSS 수집                      |
| `npm run cluster:day`            | 하루치 배치 클러스터링        |
| `npm run db:migrate` / `db:seed` | 마이그레이션 / 언론사 시드    |
| `npm run db:verify`              | DB 지문 출력 (이관 전후 대조) |
| `npm run test:unit`              | 단위 테스트 (Vitest)          |
| `npm run test:e2e`               | E2E 테스트 (Playwright)       |
| `npm run lint`                   | ESLint                        |
| `npm run format`                 | Prettier 포맷팅               |

## 🧪 테스트

```bash
npm run test:unit -- --run   # 단위 테스트 1회 실행
npm run test:e2e             # E2E (dev 서버 미리 실행 필요)
```

## 📁 프로젝트 구조

```
confirmation-bias/
├── server/            BE (DB · 인증 · 클러스터링 · 조회 쿼리)
│   ├── db.ts          Prisma 싱글턴
│   ├── auth.ts        Neon Auth 인스턴스 (SDK 의존을 여기로 격리)
│   ├── queries/       순수 Prisma 조회 (커서 페이지네이션·집계)
│   └── clustering/    embed · similarity · vector · bucket · hac · daily
├── scripts/           collect.ts(3h) · cluster-day.ts(1d) — GitHub Actions 실행
├── prisma/            schema.prisma · seed.ts
├── src/               Next.js 앱 (FSD 구조)
│   ├── app/           App Router (/ · /d/[date] · /clusters/[id] · /auth · /admin · API)
│   ├── widgets/       cluster-feed · cluster-detail · cluster-comments
│   ├── features/      outlet-filter · date-nav · profile-menu · auth-form (상태·인터랙션)
│   ├── entities/      outlet · article · cluster · comment (model · lib · api · ui)
│   └── shared/        프레임워크 무관 유틸 · 스타일(vanilla-extract)
├── e2e/               Playwright 테스트
└── docs/agent/        아키텍처 · 컨벤션 · 워크플로 문서
```

데이터 흐름은 **클라이언트(react-query) → API 라우트 → `server/queries` → DB**로,
UI 레이어는 DB에 직접 접근하지 않고 `entities/*/api.ts` 클라이언트 fetcher로 호출합니다.

## 📰 분류 대상 언론사

| 성향     | 언론사                                                 |
| -------- | ------------------------------------------------------ |
| 보수     | 조선일보, 세계일보, 천지일보, 한국경제                 |
| 중도보수 | 동아일보, 아시아경제                                   |
| 중도     | 연합뉴스, 뉴시스, 서울신문, 시사저널, SBS              |
| 중도진보 | 경향신문                                               |
| 진보     | 한겨레신문, 프레시안, 여성신문, 오마이뉴스, 미디어오늘 |

> 성향 분류는 미디어 연구를 참고한 상대적 위치 표시이며, 절대적 기준이 아닙니다.
> 시사인은 RSS 피드가 2023년 이후 갱신되지 않아 수집을 중단했습니다(과거 기사는 유지).

기사는 **제목 + 300자 발췌 + 출처 + 원문 링크**만 표시하며 전문을 저장하지 않습니다.
저작권자의 표시 중단 요청은 [이용약관](https://www.confirmationbias.app/terms)의 문의처로
받습니다.

---

<sub>포트폴리오 / 학습 목적 프로젝트입니다.</sub>
