# 외부 서비스 (인프라 운영)

confirmation-bias 실서비스는 **4개 외부 서비스**로 구성된다. 이 문서는 각 서비스의 역할·계정·
설정·시크릿·점검 지점을 한곳에 정리한 운영 레퍼런스다. (값=시크릿은 여기 적지 않는다.)

## 토폴로지 한눈에

```
                      ┌──────────────────────────┐
                      │     Neon (Postgres)      │  ← 단일 진실 공급원
                      └─────▲──────────────┬─────┘
                      write │              │ read
        ┌───────────────────┴──┐      ┌────┴───────────────────┐
        │   GitHub Actions     │      │        Vercel          │
        │ pipeline.yml (6시간마다)│      │   Next.js 웹 서빙       │
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

| 항목        | 값                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 역할        | Next.js 16 앱 서빙(대시보드). Neon에서 **읽기만**.                                                                                                  |
| 플랜        | Hobby(무료, 비상업적). 수익화 시 Pro로 상향.                                                                                                        |
| Production  | https://www.confirmationbias.app/                                                                                                                   |
| 도메인      | 주 도메인 **`www.confirmationbias.app`**. apex(`confirmationbias.app`)는 www로 308 리다이렉트. `SITE_URL`도 www 기준(불일치 시 canonical 체인 발생) |
| 빌드        | `npm run build` = `prisma generate && next build` (생성물 gitignore)                                                                                |
| 환경변수    | `DATABASE_URL`(Neon pooled) 필수. `NEXT_PUBLIC_SITE_URL`은 선택(미설정 시 www 폴백; **설정한다면 www로**). OpenAI/DIRECT_URL 불필요.                |
| 함수 리전   | **`sin1`(싱가포르)** — `vercel.json`의 `regions`로 고정. Neon과 같은 리전이어야 한다. 확인: 응답 헤더 `x-vercel-id: <edge>::<함수리전>::…`          |
| 배포 트리거 | GitHub `main` push 시 자동 재배포                                                                                                                   |
| Node        | `package.json` `engines.node ">=22"`를 Vercel이 읽어 정렬                                                                                           |
| 대시보드    | https://vercel.com/ (프로젝트 → Deployments / Settings)                                                                                             |
| 점검 지점   | 빌드 실패→로그 / 데이터 빈 화면→`DATABASE_URL` 환경변수 / 느린 TTFB→`x-vercel-id` 함수 리전 / preview 로그인벽=Deployment Protection(정상)          |

### 3. Neon — 데이터베이스

| 항목      | 값                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| 역할      | Postgres 18.6. 전 서비스의 단일 진실 공급원(읽기=Vercel, 쓰기=GH Actions).                                        |
| 플랜      | Free. Region `ap-southeast-1`(싱가포르) — **서울 리전이 없어 싱가포르 선택**.                                     |
| 연결      | `DATABASE_URL`(pooled, 호스트에 `-pooler`)=런타임 / `DIRECT_URL`(direct)=마이그레이션                             |
| 시크릿    | 연결 문자열: 로컬 `.env`, GH Actions(`DATABASE_URL`), Vercel(`DATABASE_URL`)                                      |
| 대시보드  | https://console.neon.tech (endpoint ID는 공개 레포라 미기재 — 콘솔/`.env` 참조). DB `neondb`, role `neondb_owner` |
| 한도      | **storage 0.5GB**(현재 261MB) / compute 100 CU-h월 / 5분 무활동 autosuspend                                       |
| egress    | 사실상 제한 없음 — Supabase에서 목을 조르던 5GB/월 제약이 사라진 게 이관의 주된 동기                              |
| collation | `C.UTF-8`(builtin). Supabase의 `en_US.UTF-8`(ICU)과 다르므로 크로스 DB 해시 대조 시 주의                          |
| 주의      | `.env` 값을 **작은따옴표로 감쌀 것** — 연결 문자열의 `&`가 셸 `source`에서 깨진다                                 |

> 이관 경위·검증·롤백은 [db-migration-neon.md](./db-migration-neon.md).
> 롤백용 Supabase 프로젝트를 **2026-09-07까지** 유지 중.

### 4. GitHub — 저장소 + 자동화

| 항목       | 값                                                                          |
| ---------- | --------------------------------------------------------------------------- |
| 역할       | 소스 저장소 + GitHub Actions(CI + 6시간마다 수집 파이프라인)                |
| 저장소     | `gastroad/confirmation-bias` (**public** → Actions 무료 분 무제한)          |
| 워크플로우 | `ci.yml`(push/PR: tsc·lint·test) / `pipeline.yml`(6시간마다 collect+ingest) |
| 시크릿     | Repo Settings → Secrets → `OPENAI_API_KEY`, `DATABASE_URL`                  |
| 대시보드   | https://github.com/gastroad/confirmation-bias/actions                       |
| 점검 지점  | cron 지연(부하 시 수 분) / 60일 무활동 시 schedule 비활성화 / 실패 시 로그  |

---

## 시크릿 위치 매트릭스

| 시크릿           | 로컬 `.env` | GitHub Actions | Vercel | 용도                     |
| ---------------- | ----------- | -------------- | ------ | ------------------------ |
| `OPENAI_API_KEY` | ✅          | ✅             | ❌     | 임베딩/판정 (파이프라인) |
| `DATABASE_URL`   | ✅          | ✅             | ✅     | DB 런타임 연결 (pooler)  |
| `DIRECT_URL`     | ✅          | ❌             | ❌     | 마이그레이션 (로컬 전용) |

> 한 곳에서 값을 바꾸면(예: Neon 비밀번호 재발급) **위 ✅ 칸 전부**를 갱신해야 한다.

## 장애 시 빠른 점검

| 증상                           | 1순위 확인                                                     |
| ------------------------------ | -------------------------------------------------------------- |
| 웹은 뜨는데 데이터가 빔        | Vercel `DATABASE_URL` 환경변수 / Neon compute 한도 소진 여부   |
| 6시간마다 적재 안 됨           | GitHub Actions 로그 / Secrets 2종 / OpenAI 쿼터                |
| 파이프라인이 비정상적으로 느림 | OpenAI 429/431 재시도(embed.ts) / ingest dedup 동작 여부       |
| 웹 TTFB가 수백 ms              | `x-vercel-id`의 함수 리전이 `sin1`인지 (불일치 시 태평양 왕복) |
| 첫 요청만 유독 느림            | Neon autosuspend wake (5분 무활동 후 정상 동작)                |
| Vercel 빌드 실패               | 빌드 로그 / `prisma generate` 포함 여부 / Node 버전            |
| preview URL이 로그인 요구      | 정상(Deployment Protection). production URL을 쓸 것            |

## 비용 요약 (현재)

- **전부 무료 티어**로 운영 중. OpenAI만 사용량 과금이며, ingest dedup으로 신규 기사에만 발생.
- 향후 비용 발생 트리거: 수익화 시 Vercel Pro($20/월), **Neon storage 0.5GB 초과**(현재 261MB), OpenAI 사용량.
