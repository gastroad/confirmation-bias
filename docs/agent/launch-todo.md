# 실서비스 런칭 TODO

confirmation-bias를 로컬 전용에서 실서비스로 런칭하기 위한 작업 목록.
우선순위: **P0(런칭 블로커) → P1(런칭 직후 필요) → P2(런칭 후 개선)**.

현재 상태(2026-08-24): **P0 전 항목 종결.** Neon 이관 · 일별 배치 클러스터링 · 날짜별 뷰 ·
인증 · 댓글 · 캐싱 · RSS 정리 · 저작권 대응 · 이용약관까지 완료.
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
- [ ] **파이프라인 실패 알림** ⚠️ **2026-08-30 재개봉** — GitHub 기본 알림에 기댔으나
      **워크플로우가 실패하지 않는다.** `collect.ts`는 피드 fetch가 실패해도 빈 배열을 돌려주고
      success로 끝나므로 메일이 울릴 일이 없다. 실제로 8/27~8/29에 수집 간격이 최대 15시간으로
      벌어지고 하루 기사가 740건 → 281건으로 떨어지는 동안 초록불이었다.
      → [collection-reliability.md](./collection-reliability.md)
- [x] **OpenAI 비용 모니터링 / 상한** ✅ 실측으로 종결(2026-08-24) — **P0가 아니었다**
      **월 $0.04.** 전체 24,054건을 처음부터 재임베딩해도 $0.07이다.
      (기사당 224자 ≈ 149토큰 × 458건/일 × 30일 = 2.05M 토큰 × $0.02/1M) - LLM 판정(`gpt-4o-mini`)을 일별 배치 전환에서 뺐다. 비용의 대부분이 그쪽이었다. - `description` 300자 절단으로 입력이 546자 → 224자가 되어 절반 아래로 줄었다. - 어뷰징 경로(`/admin` 재실행)는 관리자 전용이고 `embedding IS NULL`인 기사만
      처리하므로 반복해도 추가 비용이 0이다.
      → 상한 설정은 불필요. 운영 중 대시보드로만 확인한다.

### 법무 (뉴스 서비스 필수)

- [x] **RSS 콘텐츠 저작권 검토** ✅ 완료(2026-08-24)
      ⚠️ 이 항목은 **2026-07-20에 "body 컬럼 제거함"이라고 적혀 있었으나 사실이 아니었다.**
      실제로는 24,526행 전부 null인 채 컬럼이 남아 있었고 2026-08-24에 지웠다.
      **진짜 리스크는 `body`가 아니라 `description`이었다** — 뉴시스·서울신문·천지일보가
      RSS에 본문 전문(최대 7,681자)을 실어 보냈고 그게 클러스터 상세에 그대로 렌더됐다.
      정책 확정: **제목 + 300자 발췌 + 출처 + 원문 링크만.** 저장 시 절단하고 기존 데이터도
      잘랐다. → [rss-feeds.md](./rss-feeds.md)
- [x] **출처 표기 + 원문 링크** ✅ 이미 충족
      `ClusterDetailView`가 언론사명과 원문 링크(`target="_blank"`)를 표시한다.
- [x] **개인정보처리방침 페이지** ✅ 완료(2026-07-20) — `src/app/privacy/`. AdSense·GDPR 요건 충족.
- [x] **이용약관 페이지** ✅ 완료(2026-08-24) — `src/app/terms/`. 저작권·게시물 책임·금지행위 포함.

---

## P1 — 런칭 직후 필요 (있어야 안정적)

### 인증 (2026-08-24 도입)

- [x] **회원가입·로그인** ✅ Neon Auth(Managed Better Auth). → [auth.md](./auth.md)
- [x] **관리자 role 게이팅** ✅ `npm run grant:admin`으로 부트스트랩
- [x] **회원 탈퇴 UI** ✅ 완료(2026-08-24) — `/account/delete`.
      확인 문구("탈퇴") 입력이 있어야 버튼이 열린다. 댓글은 삭제하지 않고 익명화한다.
- [ ] **이메일 인증** — 현재 `emailVerified: false`로 가입되며 강제하지 않는다.
- [ ] **`@neondatabase/auth` 안정화 추적** — 0.5.0-beta로 도입. GA 전환 시 재검토.

### 앱 견고성

- [x] **에러/로딩/404 처리** ✅ 완료(2026-08-24)
      `error.tsx`(재시도 버튼 + digest 표시) · `loading.tsx`(스켈레톤) · `not-found.tsx`.
      Neon autosuspend wake 지연이나 장애가 흰 화면 대신 재시도로 이어진다.
- [x] **빈 상태(empty state) UI** ✅ 이미 구현되어 있었다
      `ClusterFeed`가 세 경우를 구분한다: 필터 결과 없음 / 그 날짜에 기사 없음 / 데이터 자체 없음.
      댓글·차단 목록·관리 화면에도 각각 빈 상태가 있다.
- [x] **캐싱 / 재검증 전략** ✅ 완료(2026-08-24)
      페이지 단위 revalidate는 세션(쿠키) 때문에 무력화되므로 **DTO 경계에서 데이터를 캐시**한다.
      세션 쿠키가 없으면 인증 서버 왕복을 건너뛴다(비로그인 85ms → 5ms).
      → [caching.md](./caching.md)
- [x] **클러스터 피드 페이지네이션** ✅ 이미 구현되어 있었다
      커서 기반(20건/페이지) + `IntersectionObserver` 무한 스크롤.
      정렬은 `bucketDate desc, articleCount desc, id desc`이며 12페이지 240건 중복 0으로 검증했다.

### DB / 성능

- [x] **인덱스 추가** ✅ 완료
      `Article`에 `clusterId`·`outletId`·`bucketDate` 복합 인덱스,
      `Cluster`에 `(bucketDate, articleCount desc, id desc)` 목록 인덱스.
- [x] **임베딩 저장 방식 스케일 검토** ✅ 완료(2026-08-24)
      `Cluster.centroidJson` 제거 + `Article` 임베딩을 JSON(~10KB) → `Bytes`(2,048B)로 전환.
      **DB 261MB → 109MB**(이후 저작권 대응으로 101MB). → [daily-clustering.md](./daily-clustering.md)

### CI / 품질

- [ ] **CI에 build 추가**
      `.github/workflows/ci.yml`에 `next build` 단계 없음. 현재는 Vercel Preview 배포가
      사실상의 빌드 게이트(→ [workflows.md](./workflows.md) 브랜치 전략). PR 단계에서 빌드 실패를
      직접 잡으려면 추가 필요.
- [x] **E2E 재활성화** ✅ 완료(2026-08-30, #29) — 스펙 7개(홈·상세·내비·필터·언론사·주간·SEO)와
      API 라우트 테스트를 추가했다. **CI에는 넣지 않았다** — 실 DB를 보므로 로컬 전용이다.
      → [conventions.md](./conventions.md) 테스트 절

---

## P2 — 런칭 후 개선

- [x] **수동 UI 수집 트리거** ✅ 완료(2026-08-24)
      `/admin`에서 collect·cluster-daily를 `workflow_dispatch`로 실행. 관리자 전용 게이팅은
      proxy와 Server Action 양쪽에서 이중 확인. → [auth.md](./auth.md)
- [x] **중복 뉴스 제거 고도화** ✅ 사실상 해소(2026-08-24)
      일별 배치가 임베딩 유사도로 cross-outlet 보도를 한 클러스터로 묶는다(threshold 0.62).
- [x] **`new-articles.json` 중간파일 제거** ✅ 완료(2026-08-24) — collect가 DB에 직접 적재.
- [x] **클러스터 품질 튜닝 / 검증** ✅ 1차 완료(2026-08-24)
      증분 배정 → 일별 배치 HAC로 전환. **최대 클러스터 253건 → 85건**(그마저 실제 대형 이슈).
      임계값 0.62는 세 날짜 실측 + 육안 검증으로 결정. → [daily-clustering.md](./daily-clustering.md)
- [ ] **오래된 클러스터 아카이빙 / 정리**
      무한 누적 방지.
- [x] **언론사 성향 분류 근거 투명성** ✅ 완료(2026-08-27) — `/about` 신설.
      5단계 배치와 소속 매체를 `OUTLETS`에서 렌더해 공개하고, **이 배치가 운영자가 정한
      상대적 위치이며 특정 연구의 측정치가 아니라는 것**, 품질 평가가 아니라는 것,
      이견이 타당할 수 있다는 것을 명시했다.
      **없는 출처를 지어내지 않는 쪽을 택했다** — 가짜 인용은 신뢰도를 올리는 게 아니라
      깎는다. 정량 지표를 붙이려면 별도 조사가 필요하다.
- [ ] **모니터링 / 분석**
      에러 추적(Sentry 등) + 사용자 분석.
- [x] **SEO** ✅ 완료(2026-07-08) — 메타데이터·robots·sitemap·OG 이미지·JSON-LD.
      → [infrastructure.md](./infrastructure.md) SEO 절.
- [ ] **접근성** — 부분 진행
      `aria-label`·`role`·`aria-expanded` 등을 프로필 메뉴·날짜 내비·필터·폼에 붙였고
      시맨틱 태그(`nav`·`article`·`section`)를 쓴다. **전체 점검은 하지 않았다** —
      키보드 내비게이션(드롭다운 포커스 트랩 등)과 대비비 검증이 남았다.

---

## 최대 리스크

1. ~~**저작권 (P0 법무)**~~ — 2026-08-24 대응 완료. 발췌 300자 + 출처 + 원문 링크로 제한.
   추가 리스크가 남는다면 이미지(OG 썸네일)와 대표 제목의 기계 생성 문구 정도.
2. ~~**비용 통제**~~ — 2026-08-24 실측으로 종결(월 $0.04). 위 "OpenAI 비용" 항목 참고.
3. **수집 신뢰성** ⚠️ **현재 진행 중인 유일한 실질 리스크(2026-08-30).**
   기능은 다 붙었는데 그 기능이 먹는 데이터가 조용히 새고 있다. 손실이 워크플로우 성공으로
   보고되고, 그 데이터 위에서 "누가 침묵했는가"라는 이 서비스의 핵심 주장이 만들어진다.
   → [collection-reliability.md](./collection-reliability.md)

---

## 수익화 블로커 (2026-08-25 신규)

**AdSense 심사에서 정책 위반 2건**(복제된 콘텐츠 · 가치가 별로 없는 콘텐츠)을 통보받았다.
색인된 클러스터 10,083개 중 60%가 기사 1건짜리이고 `Cluster.summary`가 0건 채워져 있어
사이트에 자체 작성 문장이 없는 것이 원인이다. 댓글·회원가입은 이 위반의 답이 아니다.

→ 진단·작업 목록은 [adsense-compliance.md](./adsense-compliance.md)로 분리했다.
