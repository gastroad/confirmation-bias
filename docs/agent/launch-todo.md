# 실서비스 런칭 TODO

confirmation-bias를 로컬 전용에서 실서비스로 런칭하기 위한 작업 목록.
우선순위: **P0(런칭 블로커) → P1(런칭 직후 필요) → P2(런칭 후 개선)**.

현재 상태: **DB Neon(Postgres 18) 전환 + 일별 배치 클러스터링 전환 완료(2026-08-24)**.
GitHub Actions가 수집 3시간마다 / 클러스터링 하루 1회로 자동 실행.

---

## P0 — 런칭 블로커 (이게 없으면 서비스 불가)

### 인프라 / 호스팅

- [x] **호스팅 배포** ✅ 라이브(2026-06-29) — **Vercel(Hobby)**.
      production URL: https://confirmationbias.app/ (공개, 로그인 불필요).
      `build` = `prisma generate && next build`, 환경변수는 `DATABASE_URL`(pooler) 하나.
      라이브 검증: `/api/clusters/stats` 정상(422 클러스터·601 기사), 홈 200/45ms.
      (수익화 시 Hobby→Pro. preview 배포는 Vercel Authentication으로 보호됨 — production만 공개.)
- [x] **SQLite → Postgres(Supabase) 마이그레이션** ⭐ 선행 작업 ✅ 완료(2026-06-29)
      다른 P0/P1 인프라 항목(호스팅, 스케줄링, E2E 재활성화 등)이 모두 이걸 전제로 함.
      → 상세 실행 계획: [db-migration-supabase.md](./db-migration-supabase.md)
- [x] **Supabase → Neon 재이관** ✅ 완료(2026-08-24)
      egress 5GB/월 한도가 수집 주기를 6시간으로 묶고 있던 걸 해소. 이관 중 Vercel 함수 리전이
      `iad1`(워싱턴)인 걸 발견해 `sin1`로 고정(TTFB 500~725ms의 주원인).
      → [db-migration-neon.md](./db-migration-neon.md)
- [x] **시크릿 관리** ✅ (2026-06-29)
      GitHub Actions Secrets(`OPENAI_API_KEY`+`DATABASE_URL`), Vercel 환경변수(`DATABASE_URL`).
      `.env`는 gitignore 유지(로컬 전용).

### 데이터 파이프라인 자동화

- [x] **RSS 수집 스케줄링** (배치) ✅ 가동(2026-06-29)
      **GitHub Actions로 `collect.yml`(3시간) + `cluster-daily.yml`(KST 05:00) 자동 실행.**
      매시간 → 6시간(Supabase egress, 2026-07-08) → **3시간 + 클러스터링 분리(2026-08-24)**.
      → 상세 설계: [pipeline-scheduling.md](./pipeline-scheduling.md), egress 대응: [infrastructure.md](./infrastructure.md)
- [ ] **파이프라인 실패 알림**
      OpenAI 쿼터 소진·DB 연결 실패 시 무음 실패 방지. 실패 시 알림(Slack/이메일).
- [ ] **OpenAI 비용 모니터링 / 상한**
      신규 기사에만 임베딩 호출(URL upsert로 중복 차단)되지만, 배치 주기마다 호출되므로 사용량 추적 필수.
      6시간마다 주기로 운영하며 **토큰 사용량을 보고 주기/상한 결정**.

### 법무 (뉴스 서비스 필수)

- [ ] **RSS 콘텐츠 저작권 검토**
      요약/링크/발췌만 노출하는 정책 유지. 전문 저장용 `Article.body` 컬럼은 제거함(2026-07-20)
      — 데이터 모델 차원에서 전문 미저장을 강제. 발췌 길이·출처 표기 정책은 계속 확정 필요.
      (가장 큰 런칭 리스크)
- [ ] **출처 표기 + 원문 링크**
      각 기사 카드에 언론사 명시 + 원문 클릭 이동 보장.
- [x] **개인정보처리방침 페이지** ✅ 완료(2026-07-20) — `src/app/privacy/`. AdSense·GDPR 요건 충족.
- [ ] **이용약관 페이지** — 미작성.

---

## P1 — 런칭 직후 필요 (있어야 안정적)

### 앱 견고성

- [ ] **에러/로딩/404 처리**
      `src/app`에 `error.tsx`, `loading.tsx`, `not-found.tsx` 없음.
      Server Component가 DB를 직접 조회하므로 DB 장애 시 graceful fallback 필요.
- [ ] **빈 상태(empty state) UI**
      클러스터/기사 없을 때 화면 처리.
- [ ] **캐싱 / 재검증 전략**
      Server Component DB 조회의 ISR/revalidate 정책 정의 (수집 주기에 맞춰).
- [ ] **클러스터 피드 페이지네이션**
      `src/widgets/cluster-feed/ui/ClusterFeed.tsx` 전체 로드 추정.
      데이터 누적 시 무한 스크롤/페이징 필요.

### DB / 성능

- [x] **인덱스 추가** ✅ 완료
      `Article`에 `clusterId`·`outletId`·`bucketDate` 복합 인덱스,
      `Cluster`에 `(bucketDate, articleCount desc, id desc)` 목록 인덱스.
- [x] **임베딩 저장 방식 스케일 검토** ✅ 완료(2026-08-24)
      `Cluster.centroidJson` 제거 + `Article` 임베딩을 JSON(~10KB) → `Bytes`(2,048B)로 전환.
      **DB 261MB → 109MB.** → [daily-clustering.md](./daily-clustering.md)

### CI / 품질

- [ ] **CI에 build 추가**
      `.github/workflows/ci.yml`에 `next build` 단계 없음. 현재는 Vercel Preview 배포가
      사실상의 빌드 게이트(→ [workflows.md](./workflows.md) 브랜치 전략). PR 단계에서 빌드 실패를
      직접 잡으려면 추가 필요.
- [ ] **E2E 재활성화**
      `home.spec.ts` 하나뿐이고 CI에서 e2e 미실행(원격 DB 대기 중).
      원격 DB 전환은 끝났으므로(Neon) 활성화 가능 + 핵심 플로우 커버.

---

## P2 — 런칭 후 개선

- [ ] **수동 UI 수집 트리거** (런칭 후 + 회원가입 기능과 함께)
      UI "지금 수집" 버튼 → API route → GitHub Actions `workflow_dispatch` 호출로 같은
      배치 워크플로우 실행. **관리자 전용 게이팅 필수**(공개 시 OpenAI 비용 어뷰징 경로).
      회원가입/인증 도입 이후 추가. → 설계 메모: [pipeline-scheduling.md](./pipeline-scheduling.md)
- [x] **중복 뉴스 제거 고도화** ✅ 사실상 해소(2026-08-24)
      일별 배치가 임베딩 유사도로 cross-outlet 보도를 한 클러스터로 묶는다(threshold 0.62).
- [x] **`new-articles.json` 중간파일 제거** ✅ 완료(2026-08-24) — collect가 DB에 직접 적재.
- [x] **클러스터 품질 튜닝 / 검증** ✅ 1차 완료(2026-08-24)
      증분 배정 → 일별 배치 HAC로 전환. **최대 클러스터 253건 → 85건**(그마저 실제 대형 이슈).
      임계값 0.62는 세 날짜 실측 + 육안 검증으로 결정. → [daily-clustering.md](./daily-clustering.md)
- [ ] **오래된 클러스터 아카이빙 / 정리**
      무한 누적 방지.
- [ ] **언론사 성향 분류 근거 투명성**
      `leaning` 분류 기준 공개 (서비스 신뢰도).
- [ ] **모니터링 / 분석**
      에러 추적(Sentry 등) + 사용자 분석.
- [x] **SEO** ✅ 완료(2026-07-08) — 메타데이터·robots·sitemap·OG 이미지·JSON-LD.
      → [infrastructure.md](./infrastructure.md) SEO 절.
- [ ] **접근성** — 시맨틱 마크업·ARIA·키보드 내비게이션 점검.

---

## 최대 리스크 2가지

1. **저작권 (P0 법무)** — 뉴스 전문 저장·표시는 실서비스에서 분쟁 소지가 큼.
2. **파이프라인 자동화 + 비용 통제** — 수동 실행을 자동화하면서 OpenAI 비용이
   통제 안 되면 사고로 직결.
