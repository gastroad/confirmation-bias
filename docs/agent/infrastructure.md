# Infrastructure

> 외부 서비스(OpenAI·Vercel·Neon·Neon Auth·ImprovMX·AdSense·GitHub) 계정·시크릿·점검 지점은
> [external-services.md](./external-services.md) 참고.

## 현재 상태

| 항목   | 현재 값                                                     |
| ------ | ----------------------------------------------------------- |
| DB     | Neon (Postgres 18.6), region `ap-southeast-1`(싱가포르)     |
| ORM    | Prisma v7 + `@prisma/adapter-pg`                            |
| 임베딩 | OpenAI `text-embedding-3-small`, 512차원                    |
| 호스팅 | Vercel (Hobby) — Next.js 서빙만. 함수 리전 `sin1`(싱가포르) |

> SQLite → Supabase(2026-06-29) → **Neon(2026-08-24)**. 이관 경위·검증 절차는
> [db-migration-neon.md](./db-migration-neon.md) 참고. 롤백용 Supabase 프로젝트는 2026-10-23에 삭제했다.

## 환경변수 (`.env`)

```
DATABASE_URL='postgresql://neondb_owner:...@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
DIRECT_URL='postgresql://neondb_owner:...@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
OPENAI_API_KEY='sk-...'
NEXT_PUBLIC_SITE_URL=https://www.confirmationbias.app  # (선택) SEO canonical/OG의 절대 URL. 미설정 시 프로덕션 도메인으로 폴백
```

- **값을 작은따옴표로 감싼다.** Neon 문자열엔 `&`(쿼리 파라미터 구분자)가 있어 셸에서 `. ./.env`
  할 때 파싱이 깨진다. 큰따옴표는 비밀번호의 `$`가 확장될 수 있어 작은따옴표를 쓴다.
- **`DATABASE_URL`(pooled — 호스트에 `-pooler`)** — 앱 런타임. `server/db.ts`의 `PrismaPg` 어댑터가 사용.
- **`DIRECT_URL`(direct — `-pooler` 없음)** — `prisma db push`/migrate용. `prisma.config.ts`가 이쪽을 가리킨다.
- Neon Console → **Connect** → 스니펫 드롭다운 `.env` 에서 복사. Neon은 pooled를 `DATABASE_URL`,
  direct를 `DATABASE_URL_UNPOOLED`라는 이름으로 준다. **두 문자열은 호스트의 `-pooler` 유무만 다르다.**

`scripts/`와 `prisma/` 스크립트는 `--env-file-if-exists=.env` 로 로드.
Next.js는 자동으로 `.env` 로드.

### Vercel(웹 호스트)에 필요한 시크릿

- `DATABASE_URL` — DB 런타임 연결
- `NEON_AUTH_BASE_URL` · `NEON_AUTH_COOKIE_SECRET` — 인증 (2026-08-24 추가)
- `GITHUB_DISPATCH_TOKEN` — `/admin`의 수동 트리거 (없으면 그 버튼만 실패, 사이트는 정상)
- **`OPENAI_API_KEY`는 불필요.** `server/clustering/*`에서만 쓰이고 이는 파이프라인(GitHub
  Actions)만 import한다.
- **`DIRECT_URL`도 불필요.** 마이그레이션은 로컬에서만 수행.

> 2026-08-24 이전까지 웹 런타임 시크릿은 `DATABASE_URL` 하나였다. 인증 도입으로 그 전제가
> 깨졌으므로 배포 시 누락에 주의한다(**프로덕션에서만 터진다**).

## Prisma 주의사항

- 생성된 클라이언트는 `src/generated/prisma/` (gitignore됨)
- **`postinstall`·`predev`가 `prisma generate`를 자동 실행한다**(2026-08-24 추가).
  스키마가 바뀐 브랜치를 pull한 뒤 dev를 띄우면 생성물이 stale이라 런타임에 깨지는데,
  이걸 막는다. husky pre-commit이 아닌 이유: 생성물이 gitignore라 커밋과 무관하고,
  문제가 터지는 시점은 커밋할 때가 아니라 **남의 스키마 변경을 pull한 뒤**다.
- 수동 실행이 필요하면 `npm run db:generate` (CI에서도 자동 실행됨)
- **Vercel 빌드는 스텝을 못 끼우므로 `build` 스크립트가 `prisma generate && next build`.**
  생성물이 gitignore라 이게 없으면 클라이언트 부재로 빌드 실패.
- 스키마 파일: `prisma/schema.prisma`
- Prisma 런타임 설정: `prisma.config.ts` (CLI용 datasource URL = `DIRECT_URL` 주입)
- **스키마 변경은 `db push`가 아니라 마이그레이션으로 한다**(2026-08-24 전환).
  절차는 [workflows.md](./workflows.md) "DB 초기화" 절. 배포 파이프라인에 자동 적용 스텝이
  없으므로 **로컬에서 `npm run db:migrate` 후 코드를 머지**한다.
- **Prisma 7 CLI 변경점** (구 문서·구 습관과 어긋나는 것들):
  - `prisma db push --skip-generate` 옵션 제거
  - `migrate diff --to-schema-datamodel` → **`--to-schema`**, `--from-schema-datasource` → **`--from-config-datasource`**
  - `migrate diff`는 로그를 stdout에 섞으므로 SQL로 뽑을 때 **`2>/dev/null`** 필수

## 자동 파이프라인 (가동 중)

| 워크플로우          | 주기                       | 하는 일                                    |
| ------------------- | -------------------------- | ------------------------------------------ |
| `collect.yml`       | 3시간마다 (`17 */3 * * *`) | RSS → `Article` 직접 적재. OpenAI 미사용   |
| `cluster-daily.yml` | KST 05:00 (`0 20 * * *`)   | 전날 KST 하루를 통째로 재클러스터링 (멱등) |

- 2026-08-24에 하나였던 `pipeline.yml`을 둘로 쪼갰다. RSS는 항목이 빠르게 밀려 나가 자주
  긁어야 하지만 클러스터링은 하루가 닫힌 뒤 한 번이면 된다.
- **`data/new-articles.json` 중간 파일은 제거됐다.** collect가 DB에 직접 쓴다.
- 설계·임계값 근거: [daily-clustering.md](./daily-clustering.md)
- ⚠️ **cron 주기는 보장되지 않는다.** GitHub Actions `schedule`은 SLA가 없어 2026-08-27~29에
  실행 간격이 최대 **14.9시간**까지 벌어졌다. 피드가 3~5시간치만 담는 매체(오마이뉴스 3.0h ·
  세계일보 5.4h)는 그 사이 기사를 통째로 잃는다. 게다가 **collect는 피드가 죽어도 success로
  끝난다.** → [collection-reliability.md](./collection-reliability.md)

## Neon 리소스 관리

Supabase에서 목을 조르던 **egress 5GB/월** 제약은 Neon에 없다. 대신 다른 축이 걸린다.

| 한도    | Neon Free   | 현재 (2026-10-23 실측, `pg_database_size`)                                             |
| ------- | ----------- | -------------------------------------------------------------------------------------- |
| storage | 0.5GB       | **112MB (22%)** — Article 84MB(heap 45 · 인덱스 17 · TOAST 23)/61,364행 · Cluster 20MB |
| compute | 100 CU-h/월 | 5분 무활동 시 autosuspend                                                              |

> 2026-10-23 임베딩 보존 기간 도입 **전**에는 268MB(54%)였다. 당시 `Article` 240MB의
> 내부는 heap 51MB · 인덱스 27MB · **TOAST 162MB**이고 TOAST에 있는 것이 임베딩이다. 행당
> ~4.0KB × 월 14,000~19,000건이라 남은 ~244MB는 **약 3.4개월**이었다. 아래 "임베딩 보존 기간"
> 이후 증가는 월 ~23MB다. 새 테이블을 제안할 때는 이 표의 값으로 판단한다.

**어느 수치인가.** 이 문서의 storage 값은 전부 **`pg_database_size`**(DB 안에서 잰 값)다. Neon 콘솔의
Storage는 시점 복구(PITR) 히스토리까지 함께 집계해 이보다 클 수 있다 — 한도가 어느 쪽에 걸리는지는
확인하지 않았다(2026-10-23). 예전 표의 "101MB"(2026-08-24)는 어느 기준이었는지 기록이 없다.

- **storage는 2026-08-24에 261MB → 101MB로 줄였다**(그 뒤 유입으로 다시 늘었다 — 위 표). `Cluster.centroidJson`을 없애고(일별 배치는
  배치가 끝나면 centroid를 다시 쓰지 않는다) `Article`의 임베딩을 JSON 문자열(~10KB)에서
  `Bytes`(2,048B)로 옮겼다. → [daily-clustering.md](./daily-clustering.md)
  같은 날 `description`을 300자로 자르고 미사용 `body` 컬럼을 지워 89MB가 됐다
  (저작권 대응이 주목적이었다). → [rss-feeds.md](./rss-feeds.md)
- **autosuspend**: 5분 무활동 후 컴퓨트가 잠들고 첫 요청에 wake 지연이 붙는다.
- Postgres는 컬럼 drop·NULL 갱신만으로 디스크를 돌려주지 않는다 → 대량 제거 후 `VACUUM FULL` 필요
  (아래 "임베딩 보존 기간"의 주의사항을 따른다).
  (마이그레이션은 트랜잭션 안에서 돌아 `VACUUM FULL`을 넣을 수 없다. 적용 후 따로 실행한다.)
- **collation이 Supabase와 다르다**: `en_US.UTF-8`(ICU) → `C.UTF-8`(builtin). 데이터는 동일하고
  텍스트 정렬 규칙만 다르다. 우리가 텍스트로 정렬하는 건 `id`(uuid)뿐이라 영향이 없고,
  바이트 비교라 인덱스는 오히려 빠르다. (이관 검증 시 `order by url` 해시만 갈렸던 원인)

### 임베딩 보존 기간 (2026-10-23)

**`EMBEDDING_RETENTION_DAYS`(14일, `server/clustering/retention.ts`)보다 오래된 날짜의
`Article.embedding`을 비운다.** 근거 수치는 그 상수 옆 주석에 있다.

- **왜 지워도 되나.** 임베딩을 읽는 곳은 `clusterDay`(그날 기사만)와 `backfill:titles` 둘뿐이다.
  지난 날짜를 다시 읽는 경우는 그 날짜 재클러스터링인데, 클러스터 id가 바뀌어 색인 URL이 404가
  되므로 이미 하지 않는다 → [workflows.md](./workflows.md)의 백필 경고.
- **왜 TOAST를 통째로 먹나.** 512차원 × 4B = 2,048B가 TOAST 임계(~2KB)를 넘어 전량 외부
  저장되고, 난수성 float라 압축되지 않는다. 2,000B 청크 둘로 쪼개져(둘째는 48B) 행당 실점유가
  약 2.7KB다(실측: 값 60,862개 → 청크 121,724개, TOAST 159MB).
- **핵심은 일회성 회수가 아니라 증가율이다.** 임베딩을 빼면 행당 ~1.3KB라 월 ~72MB → **~23MB**
  (1/3)가 되고, 14일치(~23MB)는 롤링 버퍼로 상시 남는다. 일회성으로는 2026-10-23 기준
  52,412행 · TOAST 약 139MB가 재사용 가능해진다.
- **잃는 것.** 지난 날짜로 임계값을 재튜닝하는 경로(`cluster:day --dry-run --threshold=…`) —
  0.62를 고른 방식이다. `--embed-missing`을 붙이면 메모리에서 다시 임베딩해 그대로 쓸 수 있다
  (DB에 쓰지 않는다. 기사당 ~149토큰 × $0.02/1M → 5만 건에 약 $0.16). 그리고 `backfill:titles`가
  보존 기간 밖 클러스터를 건너뛴다(건너뛴 수를 출력한다). 계획된 cross-outlet 중복 감지는 수집
  직후에 쓰는 기능이라 최근 14일로 성립한다.
- **클러스터 아카이빙으로는 안 풀린다.** `Cluster`는 20MB뿐이고, 클러스터를 지워도 기사는
  `clusterId`만 NULL이 되어 240MB가 그대로 남는다. 대신 색인 URL 404와 `Comment` CASCADE라는,
  지금까지 피해 온 비용을 치른다.

**실행.** `cluster-daily.yml`이 클러스터링 뒤에 `prune:embeddings --apply --max-rows=5000`을
돌린다(평소 하루치 ~500행). **첫 대량 회수는 cron이 하지 않는다** — 대상이 5,000행을 넘으면
쓰지 않고 실패해 Actions에 드러난다. 사람이 아래 순서로 한 번 돌린다.

```bash
npm run prune:embeddings                 # 기본이 DRY RUN — 대상 행·날짜 범위·회수 추정
npm run prune:embeddings -- --apply      # 확인 후 반영(2,000행씩 UPDATE, 멱등)
```

#### NULL로 비우는 것과 디스크를 돌려받는 것은 다르다

- **NULL만으로는 `pg_database_size`가 줄지 않는다.** 지워진 TOAST 청크는 dead tuple로 남고,
  autovacuum이 그 자리를 **재사용 가능**으로 표시할 뿐 파일 크기는 그대로다. 오히려 첫 적용
  직후엔 UPDATE가 heap 행을 새로 써서(최대 ~44MB) **잠시 커질 수 있다.**
- 그래도 **"더 커지지 않게"는 autovacuum만으로 달성된다.** 새 임베딩이 빈 TOAST 공간을,
  새 기사 행이 빈 heap 공간을 재사용한다. 증가율이 1/3이 되는 효과는 VACUUM FULL과 무관하다.
- **실제로 줄이려면 `VACUUM FULL`을 사람이 한 번 돌린다. 자동화하지 않는다.**
  - 테이블을 새 파일로 다시 쓰는 동안 옛 파일과 공존한다. 새 `Article`이 ~100MB(heap 51 · 인덱스
    27 · 14일치 TOAST ~22)라 **peak가 약 390~410MB** — 0.5GB 아래지만 여유가 작다.
  - **ACCESS EXCLUSIVE 락**이라 그동안 `Article`은 읽기도 막힌다(사이트 상세·집계가 기다린다).
    수집(`collect.yml`, KST 0·3·6·…·21시 17분)·클러스터링(KST 05:00) 실행과 겹치면 안 된다.
    GitHub Actions 탭에서 진행 중인 실행이 없는지 보고, 수집 직후 시각을 고른다.
  - Neon 콘솔 → SQL Editor에서 `VACUUM (FULL, VERBOSE, ANALYZE) "Article";` (트랜잭션 밖이어야
    한다). 완료 후 `pg_database_size`를 재서 위 표를 갱신한다.

> **적용 기록(2026-10-23).** 14:40 KST 첫 `--apply`(52,412행) + 일반 `VACUUM` → 267.7 → 305.1MB
> (heap 재기록). 14:43 KST `VACUUM (FULL, ANALYZE) "Article"` — **1.5초**, 진행 중인 Actions 없음을
> 확인하고 `DIRECT_URL` 세션에서 `lock_timeout = '10s'`로 돌렸다 → **112MB**. `Article` 277 → 84MB.
> 행 수·남은 임베딩(8,450) 그대로, 직후 라이브 사이트 200.

### 지연(latency) 구조

DB가 싱가포르이므로 **Vercel 함수 리전을 같이 맞춰야 한다.** `vercel.json`의 `regions: ["sin1"]`이 그것.

- **이관 전 문제**: `vercel.json`이 없어 함수가 기본값 `iad1`(워싱턴)에서 돌았고 DB는 서울이라
  프로덕션 TTFB가 **500~725ms**였다. DB 위치보다 함수 리전 불일치가 지배적이었다.
- 응답 헤더 `x-vercel-id: <edge>::<function-region>::...` 의 **두 번째 값이 실제 함수 리전**이다.
  `curl -sSI https://www.confirmationbias.app/ | grep x-vercel-id` 로 확인.
- 참고 실측: 로컬(서울) → Neon(싱가포르) 쿼리 왕복 ~75ms, 새 커넥션 수립까지 포함하면 ~600ms.
  dev 서버 워밍 후 `/api/clusters/stats` TTFB ~95ms.

## SEO

Next.js Metadata API 기반. 단일 출처는 `src/shared/config/site.ts`(SITE_URL·이름·설명·키워드).

| 요소                | 위치                                          | 비고                                                                                                            |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 전역 메타데이터     | `src/app/layout.tsx`                          | metadataBase·title.template·OG·Twitter·robots·canonical·viewport                                                |
| 페이지별 메타데이터 | `src/app/clusters/[id]/page.tsx`              | `generateMetadata`(제목=대표기사, canonical, og:type=article)                                                   |
| 날짜별 페이지       | `src/app/d/[date]/page.tsx`                   | `/d/YYYY-MM-DD`. 색인 기준을 넘긴 이슈가 0개인 날짜는 `robots: noindex`                                         |
| 첫 화면 SSR         | `src/app/_feed-seed.ts`                       | 홈·날짜 페이지의 목록 첫 페이지를 서버에서 그린다. 본문 132자 → 1,342자 (2026-10-22)                            |
| robots.txt          | `src/app/robots.ts`                           | `/api/` 차단, sitemap 링크                                                                                      |
| sitemap.xml         | `src/app/sitemap.ts`                          | 홈 + **색인 기준을 넘긴** 날짜·클러스터만. `revalidate=21600`(6h)로 크롤당 DB 조회 억제                         |
| 색인 기준           | `src/entities/cluster/model.ts`               | 기사 3건 이상 & 성향 진영 2개 이상. 미달은 `noindex, follow` → [adsense-compliance.md](./adsense-compliance.md) |
| OG 이미지           | `src/app/opengraph-image.tsx`                 | `next/og` 동적 생성. 한글 폰트는 Google Fonts에서 TTF 로드, 실패 시 영문 폴백                                   |
| 크롤러 메타데이터   | `next.config.ts`의 `htmlLimitedBots`          | JS 미실행 봇에 메타데이터를 head로 blocking 전송. 기본 목록 + 카카오톡·다음                                     |
| 구조화 데이터       | `src/shared/seo/`                             | WebSite / CollectionPage+ItemList / BreadcrumbList (JSON-LD)                                                    |
| 파비콘·로고         | `src/app/icon.svg`, `src/shared/ui/Logo.tsx`  | 프리즘 분광 마크(진보·중도·보수 분광). 헤더 락업·파비콘에 공유                                                  |
| 이용약관            | `src/app/terms/`                              | 저작권·게시물 책임·금지행위. 푸터·sitemap에 링크                                                                |
| 상태 화면           | `error.tsx` · `loading.tsx` · `not-found.tsx` | DB 장애·autosuspend wake 시 흰 화면 대신 재시도                                                                 |
| 개인정보처리방침    | `src/app/privacy/`                            | AdSense·GDPR 요건. 문의처는 `site.ts`의 `CONTACT_EMAIL`                                                         |

- **`generateMetadata`가 async면 메타데이터는 body 끝으로 스트리밍된다.** 인라인 스크립트가 head로
  옮기므로 브라우저와 Googlebot(JS 실행)은 문제없지만, JS를 실행하지 않는 크롤러는 못 읽는다.
  Next는 `htmlLimitedBots`에 걸린 UA에만 head로 blocking 전송하는데 **기본 목록에 카카오톡이 없어**
  카톡 공유 시 OG가 비었다. `next.config.ts`에서 기본 목록에 `kakaotalk-scrap`·`daumoa`를 덧붙였다.
  이 옵션은 기본 목록을 **대체**하므로, Next 업그레이드 시
  `node_modules/next/dist/shared/lib/router/utils/html-bots.js`와 대조해야 한다.
  - Lighthouse를 DevTools 패널에서 돌리면 UA에 `Chrome-Lighthouse`가 없어 스트리밍 경로를 타고
    `meta-description` 감사가 실패한다. **측정 아티팩트이며 CLI(`npx lighthouse`)로는 통과한다.**
- **egress 주의:** 상세 페이지는 `generateMetadata`와 렌더가 `cache(findClusterDetailRow)`로
  요청당 1회만 DB를 조회한다. sitemap은 `revalidate`로 조회 빈도를 6시간에 묶는다.
- **날짜 페이지가 클러스터 상세보다 상위 허브다.** sitemap에서 최신 날짜에 우선순위 0.9를 주고
  클러스터는 0.5로 낮췄다. 클러스터 id는 재클러스터링 때마다 바뀌지만 날짜 URL은 안정적이다.
- 사이트맵 URL 수가 5만을 넘기면 `generateSitemaps`로 분할 필요(현재 약 1만 개, 여유).

## 수익화 (Google AdSense)

> ⚠️ **2026-08-25 심사에서 정책 위반 2건(복제된 콘텐츠 · 가치가 별로 없는 콘텐츠)을 통보받았다.**
> 광고 게재 전에 해결해야 한다. 진단과 작업 목록 → [adsense-compliance.md](./adsense-compliance.md)

| 요소             | 위치                              | 비고                                                                      |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------- |
| 게시자 ID        | `site.ts`의 `ADSENSE_CLIENT`      | `ca-pub-8694059194416409` (공개값). 로더·verification·ads.txt 공유        |
| 로더 스크립트    | `src/shared/ui/AdSenseLoader.tsx` | `next/script`(afterInteractive). 이게 광고+**CMP 동의 배너**를 로드       |
| 로더 렌더 위치   | 아래 6개 라우트                   | **루트 레이아웃이 아니다.** 콘텐츠 페이지에서, 그것도 읽을 것이 있을 때만 |
| 사이트 확인 메타 | `layout.tsx` metadata.other       | `google-adsense-account` 메타. 소유 증명이라 루트에 그대로 둔다           |
| ads.txt          | `public/ads.txt`                  | `google.com, pub-8694059194416409, DIRECT, f08c47fec0942fa0`              |

**`ads` prop을 넘기는 라우트와 그 조건** (2026-10-22 실측 — 전엔 문서가 앞의 셋만 적고 있었다):

| 라우트           | 조건                                    |
| ---------------- | --------------------------------------- |
| `/` (홈)         | 최신 날짜의 `indexableClusterCount > 0` |
| `/d/[date]`      | 그 날짜의 `indexableClusterCount > 0`   |
| `/clusters/[id]` | `isIndexableCluster(cluster)`           |
| `/weekly`        | 리포트의 `clusterCount > 0`             |
| `/outlets`       | 기사가 있는 언론사가 1곳 이상           |
| `/outlets/[id]`  | 그 언론사의 `articleCount > 0`          |

- **로더를 루트에 두지 않는다**(2026-08-27 변경). 루트 레이아웃에 있으면 `/auth/*`·`/account/*`·
  `/admin/*` 처럼 읽을 콘텐츠가 없는 화면에도 자동광고가 붙는데, 그것 자체가 별도의 정책
  위반 항목이다. 색인 기준 미달인 클러스터·날짜에서도 같은 이유로 렌더하지 않는다.
- `/weekly`·`/outlets`는 **색인 기준이 아니라 각자의 조건**으로 가른다. 클러스터 단위 기준
  (기사 3건·진영 2개)이 적용되는 대상이 아니고, 둘 다 우리가 계산한 값만 싣는 페이지다
  (복제 텍스트 0) → [adsense-compliance.md](./adsense-compliance.md)의 P1-2.
- **CMP:** EEA·영국·스위스 동의는 AdSense "개인정보 보호 및 메시지"의 Google 자체 CMP가 담당.
  별도 스크립트 없이 위 로더가 배너를 띄운다.
- 개인화 광고·쿠키 고지는 `src/app/privacy/`(개인정보처리방침)에 포함.
- 광고 유닛을 특정 위치에 넣으려면 AdSense에서 유닛 생성 후 `data-ad-slot` ID로 배치(현재는 자동 광고 기준).

## 이용 측정 (GTM → GA4)

루트 레이아웃의 `shared/ui/TagManager`가 GTM 컨테이너를 싣고, GA4 태그는 GTM 안에서 설정한다.
**AdSense 로더와 달리 루트에 둔다**(동선이 이어져야 측정된다). Vercel Production에서만 렌더하고,
EEA·영국·스위스는 Consent Mode 기본값 denied → Google CMP가 동의를 갱신한다.
→ [analytics.md](./analytics.md)

## 중복 뉴스 제거

- 현재: collect가 `Article.url @unique` + `createMany({ skipDuplicates })`로 URL 중복을 막고,
  cluster-day는 `embedding IS NULL`인 기사만 임베딩한다(비용·지연 절감).
- 향후: 임베딩 유사도 기반 cross-outlet 중복 감지 추가 예정
