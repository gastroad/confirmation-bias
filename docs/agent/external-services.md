# 외부 서비스 (인프라 운영)

confirmation-bias 실서비스는 **4개 외부 서비스**로 구성된다. 이 문서는 각 서비스의 역할·계정·
설정·시크릿·점검 지점을 한곳에 정리한 운영 레퍼런스다. (값=시크릿은 여기 적지 않는다.)

## 토폴로지 한눈에

```
                      ┌──────────────────────────┐
                      │   Supabase (Postgres)    │  ← 단일 진실 공급원
                      └─────▲──────────────┬─────┘
                      write │              │ read
        ┌───────────────────┴──┐      ┌────┴───────────────────┐
        │   GitHub Actions     │      │        Vercel          │
        │  pipeline.yml (매시간) │      │   Next.js 웹 서빙       │
        │  collect → ingest    │      │   (방문자 대시보드)      │
        └───────────┬──────────┘      └────────────────────────┘
                    │ embeddings/judge
              ┌─────▼─────┐
              │  OpenAI   │
              └───────────┘
```

- **OpenAI**는 파이프라인(GitHub Actions)에서만 호출된다. 웹(Vercel)은 OpenAI를 쓰지 않는다.
- **GitHub**은 소스 저장소이자 자동화 실행처(Actions) 두 역할을 겸한다.

---

## 서비스별 정리

### 1. OpenAI — 임베딩 / LLM 판정

| 항목      | 값                                                                            |
| --------- | ----------------------------------------------------------------------------- |
| 역할      | `text-embedding-3-small`(512차원) 임베딩 + 0.70~0.85 구간 LLM 클러스터 판정   |
| 사용처    | `server/clustering/embed.ts`, `llm-judge.ts` → **ingest 파이프라인 전용**     |
| 시크릿    | `OPENAI_API_KEY` (GitHub Actions Secrets + 로컬 `.env`)                       |
| 대시보드  | https://platform.openai.com/usage                                             |
| 과금      | 사용량 기반. 임베딩은 신규 기사에만(ingest dedup) → 비용 거의 신규분 한정     |
| 점검 지점 | 401/403=키 문제, 429=레이트리밋, 431=Cloudflare 커넥션(embed.ts가 5회 재시도) |

### 2. Vercel — 웹 호스팅

| 항목        | 값                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| 역할        | Next.js 16 앱 서빙(대시보드). Supabase에서 **읽기만**.                                                 |
| 플랜        | Hobby(무료, 비상업적). 수익화 시 Pro로 상향.                                                           |
| Production  | https://confirmation-bias-51f8.vercel.app/                                                             |
| 빌드        | `npm run build` = `prisma generate && next build` (생성물 gitignore)                                   |
| 환경변수    | `DATABASE_URL`(pooler 6543)만. OpenAI/DIRECT_URL 불필요.                                               |
| 배포 트리거 | GitHub `main` push 시 자동 재배포                                                                      |
| Node        | `package.json` `engines.node ">=22"`를 Vercel이 읽어 정렬                                              |
| 대시보드    | https://vercel.com/ (프로젝트 → Deployments / Settings)                                                |
| 점검 지점   | 빌드 실패→로그 / 데이터 빈 화면→`DATABASE_URL` 환경변수 / preview 로그인벽=Deployment Protection(정상) |

### 3. Supabase — 데이터베이스

| 항목      | 값                                                                                      |
| --------- | --------------------------------------------------------------------------------------- |
| 역할      | Postgres. 전 서비스의 단일 진실 공급원(읽기=Vercel, 쓰기=GH Actions).                   |
| 플랜      | Free. Region `ap-northeast-2`(서울).                                                    |
| 연결      | `DATABASE_URL`(pooler 6543, pgbouncer)=런타임 / `DIRECT_URL`(5432 session)=마이그레이션 |
| 시크릿    | 연결 문자열: 로컬 `.env`, GH Actions(`DATABASE_URL`), Vercel(`DATABASE_URL`)            |
| 대시보드  | https://supabase.com/dashboard → 프로젝트 `fwvvwovmthrxfglivnhi`                        |
| 점검 지점 | Free 티어 7일 무활동 시 일시정지(매시간 파이프라인이 막아줌) / 500MB·연결 수 한도       |
| 주의      | 비밀번호의 `[YOUR-PASSWORD]` 자리는 **대괄호까지** 치환(잔존 시 P1000)                  |

### 4. GitHub — 저장소 + 자동화

| 항목       | 값                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 역할       | 소스 저장소 + GitHub Actions(CI + 매시간 수집 파이프라인)                  |
| 저장소     | `gastroad/confirmation-bias` (**public** → Actions 무료 분 무제한)         |
| 워크플로우 | `ci.yml`(push/PR: tsc·lint·test) / `pipeline.yml`(매시간 collect+ingest)   |
| 시크릿     | Repo Settings → Secrets → `OPENAI_API_KEY`, `DATABASE_URL`                 |
| 대시보드   | https://github.com/gastroad/confirmation-bias/actions                      |
| 점검 지점  | cron 지연(부하 시 수 분) / 60일 무활동 시 schedule 비활성화 / 실패 시 로그 |

---

## 시크릿 위치 매트릭스

| 시크릿           | 로컬 `.env` | GitHub Actions | Vercel | 용도                     |
| ---------------- | ----------- | -------------- | ------ | ------------------------ |
| `OPENAI_API_KEY` | ✅          | ✅             | ❌     | 임베딩/판정 (파이프라인) |
| `DATABASE_URL`   | ✅          | ✅             | ✅     | DB 런타임 연결 (pooler)  |
| `DIRECT_URL`     | ✅          | ❌             | ❌     | 마이그레이션 (로컬 전용) |

> 한 곳에서 값을 바꾸면(예: Supabase 비밀번호 재설정) **위 ✅ 칸 전부**를 갱신해야 한다.

## 장애 시 빠른 점검

| 증상                           | 1순위 확인                                               |
| ------------------------------ | -------------------------------------------------------- |
| 웹은 뜨는데 데이터가 빔        | Vercel `DATABASE_URL` 환경변수 / Supabase 일시정지 여부  |
| 매시간 적재 안 됨              | GitHub Actions 로그 / Secrets 2종 / OpenAI 쿼터          |
| 파이프라인이 비정상적으로 느림 | OpenAI 429/431 재시도(embed.ts) / ingest dedup 동작 여부 |
| Vercel 빌드 실패               | 빌드 로그 / `prisma generate` 포함 여부 / Node 버전      |
| preview URL이 로그인 요구      | 정상(Deployment Protection). production URL을 쓸 것      |

## 비용 요약 (현재)

- **전부 무료 티어**로 운영 중. OpenAI만 사용량 과금이며, ingest dedup으로 신규 기사에만 발생.
- 향후 비용 발생 트리거: 수익화 시 Vercel Pro($20/월), Supabase/OpenAI 사용량 초과.
