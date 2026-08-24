# 외부 서비스 (인프라 운영)

confirmation-bias 실서비스는 **6개 외부 서비스**로 구성된다. 이 문서는 각 서비스의 역할·계정·
설정·시크릿·점검 지점을 한곳에 정리한 운영 레퍼런스다. (값=시크릿은 여기 적지 않는다.)

## 토폴로지 한눈에

```
                      ┌──────────────────────────┐
                      │     Neon (Postgres)      │  ← 단일 진실 공급원
                      └─────▲──────────────┬─────┘
                      write │              │ read
        ┌───────────────────┴──┐      ┌────┴───────────────────┐
        │   GitHub Actions     │      │        Vercel          │
        │ collect.yml    (3시간) │      │   Next.js 웹 서빙       │
        │ cluster-daily.yml (1일)│      │   (방문자 대시보드)      │
        └───────────┬──────────┘      └────────────────────────┘
                    │ embeddings/judge
              ┌─────▼─────┐
              │  OpenAI   │
              └───────────┘
```

- **OpenAI**는 파이프라인(GitHub Actions)에서만 호출된다. 웹(Vercel)은 OpenAI를 쓰지 않는다.
- **GitHub**은 세 역할을 겸한다: 소스 저장소 · 자동화 실행처(Actions) · `/admin`이 부르는
  `workflow_dispatch` API.
- 위 그림에 없는 둘: **Neon Auth**(인증. Neon 안이지만 별도 엔드포인트)와
  **ImprovMX**(문의 메일 포워딩). 아래에 정리한다.

---

## 서비스별 정리

### 1. OpenAI — 임베딩 / LLM 판정

| 항목      | 값                                                                                  |
| --------- | ----------------------------------------------------------------------------------- |
| 역할      | `text-embedding-3-small`(512차원) **배치 임베딩** (100건/request)                   |
| 사용처    | `server/clustering/embed.ts` → **cluster-daily 워크플로우 전용** (collect는 미사용) |
| 시크릿    | `OPENAI_API_KEY` (GitHub Actions Secrets + 로컬 `.env`)                             |
| 대시보드  | https://platform.openai.com/usage                                                   |
| 과금      | 사용량 기반. 임베딩이 없는 기사에만 발생 → 새 기사가 없으면 0                       |
| 점검 지점 | 401/403=키 문제, 429=레이트리밋, 431=Cloudflare 커넥션(embed.ts가 5회 재시도)       |

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

### 4. Neon Auth — 인증 (Managed Better Auth)

| 항목      | 값                                                                                           |
| --------- | -------------------------------------------------------------------------------------------- |
| 역할      | 회원가입·로그인·세션. Better Auth를 Neon이 관리형으로 감싼 것                                |
| 위치      | 같은 Neon 프로젝트지만 **별도 엔드포인트**(`*.neonauth.*`)이며 DB와 다른 호스트다            |
| 데이터    | `neon_auth` 스키마(user·session·account·jwks 등). **Neon이 만들고 관리한다 — Prisma 밖**     |
| 패키지    | `@neondatabase/auth` **0.5.0-beta** ⚠️                                                       |
| 시크릿    | `NEON_AUTH_BASE_URL`(콘솔의 **Auth URL**) · `NEON_AUTH_COOKIE_SECRET`(직접 생성, 32자+)      |
| 대시보드  | Neon Console → 프로젝트 → Auth                                                               |
| 점검 지점 | 로그인 안 됨→시크릿 2종 / 세션이 안 잡힘→쿠키 이름(`__Secure-` 접두어) / 느린 응답→왕복 단축 |

> **베타다.** SDK 의존을 `server/auth.ts` 한 파일로 가둬 교체 여지를 남겼다. → [auth.md](./auth.md)

### 5. ImprovMX — 문의 메일 포워딩

| 항목      | 값                                                                                     |
| --------- | -------------------------------------------------------------------------------------- |
| 역할      | `contact@confirmationbias.app` → 운영자 개인 메일함으로 **수신 전용 포워딩**           |
| 왜 필요   | 약관·개인정보처리방침에 적은 유일한 연락처다. 저작권 표시 중단 요청 창구               |
| 플랜      | Free                                                                                   |
| 설정      | DNS(Vercel)에 MX 2개: `mx1.improvmx.com`(10) · `mx2.improvmx.com`(20)                  |
| 왜 이것   | **DNS를 Vercel에 둔 채** MX만 추가하면 된다. Cloudflare Email Routing은 NS 이전이 필요 |
| 대시보드  | https://improvmx.com                                                                   |
| 점검 지점 | `dig +short MX confirmationbias.app` / 대시보드에서 도메인 Active·별칭 존재 여부       |

- **발신은 설정하지 않았다.** `contact@`로 답장하려면 SPF TXT(`v=spf1 include:spf.improvmx.com ~all`)와
  Gmail의 "다른 주소에서 메일 보내기"가 추가로 필요하다.
- 로컬에서 SMTP로 검증하면 `550 No valid PTR record`가 뜬다. 가정용 IP에 역방향 DNS가 없어서이며
  **설정 문제가 아니다.** 실제 확인은 개인 메일에서 `contact@`로 보내보는 것.

### 6. Google AdSense — 수익화

| 항목      | 값                                                                                |
| --------- | --------------------------------------------------------------------------------- |
| 역할      | 광고 게재 + **EEA/영국/스위스 동의 배너(CMP)**                                    |
| 게시자 ID | `site.ts`의 `ADSENSE_CLIENT` (공개값)                                             |
| 배선      | `layout.tsx`의 로더 스크립트 · `metadata.other` 확인 메타 · `public/ads.txt`      |
| 대시보드  | https://adsense.google.com                                                        |
| 점검 지점 | 광고 미표시→사이트 승인 상태 / 동의 배너 미표시→AdSense "개인정보 보호 및 메시지" |

> 상세 배선은 [infrastructure.md](./infrastructure.md) 수익화 절.

### 7. GitHub — 저장소 + 자동화

| 항목       | 값                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------- |
| 역할       | 소스 저장소 + GitHub Actions(CI + 수집 3시간 + 클러스터링 1일)                           |
| 저장소     | `gastroad/confirmation-bias` (**public** → Actions 무료 분 무제한)                       |
| 워크플로우 | `ci.yml`(push/PR: tsc·lint·test) / `collect.yml`(3시간) / `cluster-daily.yml`(KST 05:00) |
| 시크릿     | Repo Settings → Secrets → `OPENAI_API_KEY`, `DATABASE_URL`                               |
| 대시보드   | https://github.com/gastroad/confirmation-bias/actions                                    |
| 점검 지점  | cron 지연(부하 시 수 분) / 60일 무활동 시 schedule 비활성화 / 실패 시 로그               |

---

## 시크릿 위치 매트릭스

| 시크릿                    | 로컬 `.env` | GitHub Actions | Vercel | 용도                               |
| ------------------------- | ----------- | -------------- | ------ | ---------------------------------- |
| `DATABASE_URL`            | ✅          | ✅             | ✅     | DB 런타임 연결 (pooled)            |
| `DIRECT_URL`              | ✅          | ❌             | ❌     | 마이그레이션 (로컬 전용)           |
| `OPENAI_API_KEY`          | ✅          | ✅             | ❌     | 배치 임베딩 (cluster-daily 전용)   |
| `NEON_AUTH_BASE_URL`      | ✅          | ❌             | ✅     | 인증 서버 주소                     |
| `NEON_AUTH_COOKIE_SECRET` | ✅          | ❌             | ✅     | 세션 쿠키 서명 (32자+)             |
| `GITHUB_DISPATCH_TOKEN`   | ✅          | ❌             | ✅     | `/admin`의 수동 트리거             |
| `NEXT_PUBLIC_SITE_URL`    | 선택        | ❌             | 선택   | SEO canonical (미설정 시 www 폴백) |

> 한 곳에서 값을 바꾸면(예: Neon 비밀번호 재발급) **위 ✅ 칸 전부**를 갱신해야 한다.

**2026-08-24에 웹 런타임 전제가 바뀌었다.** 그전까지 Vercel에 필요한 건 `DATABASE_URL` 하나였으나
인증 도입으로 셋이 늘었다. 누락하면 **프로덕션에서만** 터진다(로컬은 `.env`가 있어 멀쩡하다).

`VERIFY_DATABASE_URL`은 시크릿이 아니라 `npm run db:verify`가 비교 대상 DB를 받는 임시 변수다.

## 장애 시 빠른 점검

| 증상                             | 1순위 확인                                                     |
| -------------------------------- | -------------------------------------------------------------- |
| 웹은 뜨는데 데이터가 빔          | Vercel `DATABASE_URL` 환경변수 / Neon compute 한도 소진 여부   |
| 새 기사가 안 들어옴              | `collect.yml` Actions 로그 / `DATABASE_URL` Secret             |
| 기사는 있는데 클러스터가 안 생김 | `cluster-daily.yml` 로그 / `OPENAI_API_KEY` 쿼터               |
| 파이프라인이 비정상적으로 느림   | OpenAI 429/431 재시도(embed.ts) / 배치 크기                    |
| 웹 TTFB가 수백 ms                | `x-vercel-id`의 함수 리전이 `sin1`인지 (불일치 시 태평양 왕복) |
| 첫 요청만 유독 느림              | Neon autosuspend wake (5분 무활동 후 정상 동작)                |
| Vercel 빌드 실패                 | 빌드 로그 / `prisma generate` 포함 여부 / Node 버전            |
| preview URL이 로그인 요구        | 정상(Deployment Protection). production URL을 쓸 것            |

## 비용 요약 (현재)

- **전부 무료 티어**로 운영 중(Vercel Hobby · Neon Free · ImprovMX Free · GitHub public).
  OpenAI만 사용량 과금이며 임베딩이 없는 기사에만 발생한다.
- 향후 비용 발생 트리거: 수익화 시 Vercel Pro($20/월) · **Neon storage 0.5GB 초과**(현재 101MB) ·
  Neon compute 100 CU-h/월 · OpenAI 사용량.
