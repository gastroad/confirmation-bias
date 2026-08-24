# Infrastructure

> 외부 서비스(OpenAI·Vercel·Neon·GitHub) 계정·시크릿·점검 지점은
> [external-services.md](./external-services.md) 참고.

## 현재 상태

| 항목   | 현재 값                                                     |
| ------ | ----------------------------------------------------------- |
| DB     | Neon (Postgres 18.6), region `ap-southeast-1`(싱가포르)     |
| ORM    | Prisma v7 + `@prisma/adapter-pg`                            |
| 임베딩 | OpenAI `text-embedding-3-small`, 512차원                    |
| 호스팅 | Vercel (Hobby) — Next.js 서빙만. 함수 리전 `sin1`(싱가포르) |

> SQLite → Supabase(2026-06-29) → **Neon(2026-08-24)**. 이관 경위·검증 절차는
> [db-migration-neon.md](./db-migration-neon.md) 참고. 롤백용 Supabase 프로젝트는 2026-09-07까지 유지.

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

- **`DATABASE_URL`만 필요.** OpenAI는 `server/clustering/*`(embed·llm-judge)에서만 쓰이고
  이는 파이프라인(GitHub Actions)만 import하므로, 웹 런타임엔 `OPENAI_API_KEY` 불필요.
- **`DIRECT_URL`도 Vercel엔 불필요.** 마이그레이션은 GitHub Actions/로컬에서만 수행.

## Prisma 주의사항

- 생성된 클라이언트는 `src/generated/prisma/` (gitignore됨)
- 코드 변경 후 반드시 `npm run db:generate` 실행 (CI에서도 자동 실행됨)
- **Vercel 빌드는 스텝을 못 끼우므로 `build` 스크립트가 `prisma generate && next build`.**
  생성물이 gitignore라 이게 없으면 클라이언트 부재로 빌드 실패.
- 스키마 파일: `prisma/schema.prisma`
- Prisma 런타임 설정: `prisma.config.ts` (CLI용 datasource URL = `DIRECT_URL` 주입)
- **Prisma 7에서 `prisma db push --skip-generate` 옵션이 제거됐다.** 남은 플래그는
  `--accept-data-loss` / `--force-reset` / `--url` / `--schema` / `--config`.

## RSS 자동 수집 스케줄 (가동 중)

- `.github/workflows/pipeline.yml`가 **6시간마다** `collect → ingest` 자동 실행 (2026-06-29~).
  매시간→6시간마다 완화는 Supabase egress 대응이었는데(2026-07-08), **Neon 이관으로 그 제약이
  사라져 주기를 다시 좁힐 수 있다**(일별 배치 클러스터링 전환에서 반영 예정).
  → `pipeline-scheduling.md` 참조.
- `data/new-articles.json`은 collect→ingest 간 임시 중간 파일. gitignore라 ingest는
  정적 import가 아니라 **런타임에 읽는다**(빌드/타입체크 시점엔 부재). 향후 DB 직접 append로 대체 예정.

## Neon 리소스 관리

Supabase에서 목을 조르던 **egress 5GB/월** 제약은 Neon에 없다. 대신 다른 축이 걸린다.

| 한도    | Neon Free   | 현재                                 |
| ------- | ----------- | ------------------------------------ |
| storage | 0.5GB       | **261MB** (Article 159 / Cluster 93) |
| compute | 100 CU-h/월 | 5분 무활동 시 autosuspend            |

- **storage가 임박해 있다.** 261MB의 대부분이 `Article.embeddingJson`(~10KB/건 × 23,861)과
  `Cluster.centroidJson`(~10KB × 11,376)이다. 일별 배치 클러스터링 전환에서 centroid를 없애고
  임베딩을 `Bytes`(2,048B)로 바꿔 ~60MB로 줄이는 게 예정된 대응.
- **autosuspend**: 5분 무활동 후 컴퓨트가 잠들고 첫 요청에 wake 지연이 붙는다.
- Postgres는 컬럼 drop만으로 디스크를 돌려주지 않는다 → 대량 컬럼 제거 후 `VACUUM FULL` 필요.
- **collation이 Supabase와 다르다**: `en_US.UTF-8`(ICU) → `C.UTF-8`(builtin). 데이터는 동일하고
  텍스트 정렬 규칙만 다르다. 우리가 텍스트로 정렬하는 건 `id`(uuid)뿐이라 영향이 없고,
  바이트 비교라 인덱스는 오히려 빠르다. (이관 검증 시 `order by url` 해시만 갈렸던 원인)

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

| 요소                | 위치                                         | 비고                                                                          |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| 전역 메타데이터     | `src/app/layout.tsx`                         | metadataBase·title.template·OG·Twitter·robots·canonical·viewport              |
| 페이지별 메타데이터 | `src/app/clusters/[id]/page.tsx`             | `generateMetadata`(제목=대표기사, canonical, og:type=article)                 |
| robots.txt          | `src/app/robots.ts`                          | `/api/` 차단, sitemap 링크                                                    |
| sitemap.xml         | `src/app/sitemap.ts`                         | 홈 + 전체 클러스터. `revalidate=21600`(6h)로 크롤당 DB 조회 억제              |
| OG 이미지           | `src/app/opengraph-image.tsx`                | `next/og` 동적 생성. 한글 폰트는 Google Fonts에서 TTF 로드, 실패 시 영문 폴백 |
| 구조화 데이터       | `src/shared/seo/`                            | WebSite / CollectionPage+ItemList / BreadcrumbList (JSON-LD)                  |
| 파비콘·로고         | `src/app/icon.svg`, `src/shared/ui/Logo.tsx` | 프리즘 분광 마크(진보·중도·보수 분광). 헤더 락업·파비콘에 공유                |
| 개인정보처리방침    | `src/app/privacy/`                           | AdSense·GDPR 요건. 문의처는 `site.ts`의 `CONTACT_EMAIL`                       |

- **egress 주의:** 상세 페이지는 `generateMetadata`와 렌더가 `cache(findClusterDetailRow)`로
  요청당 1회만 DB를 조회한다. sitemap은 `revalidate`로 조회 빈도를 6시간에 묶는다.
- 사이트맵 URL 수가 5만을 넘기면 `generateSitemaps`로 분할 필요(현재 수천 개 수준, 여유).

## 수익화 (Google AdSense)

| 요소             | 위치                         | 비고                                                                |
| ---------------- | ---------------------------- | ------------------------------------------------------------------- |
| 게시자 ID        | `site.ts`의 `ADSENSE_CLIENT` | `ca-pub-8694059194416409` (공개값). 로더·verification·ads.txt 공유  |
| 로더 스크립트    | `src/app/layout.tsx`         | `next/script`(afterInteractive). 이게 광고+**CMP 동의 배너**를 로드 |
| 사이트 확인 메타 | `layout.tsx` metadata.other  | `google-adsense-account` 메타                                       |
| ads.txt          | `public/ads.txt`             | `google.com, pub-8694059194416409, DIRECT, f08c47fec0942fa0`        |

- **CMP:** EEA·영국·스위스 동의는 AdSense "개인정보 보호 및 메시지"의 Google 자체 CMP가 담당.
  별도 스크립트 없이 위 로더가 배너를 띄운다.
- 개인화 광고·쿠키 고지는 `src/app/privacy/`(개인정보처리방침)에 포함.
- 광고 유닛을 특정 위치에 넣으려면 AdSense에서 유닛 생성 후 `data-ad-slot` ID로 배치(현재는 자동 광고 기준).

## 중복 뉴스 제거

- 현재: ingest가 **임베딩 전에 기존 URL을 일괄 조회해 제외** → 신규 기사만 임베딩(비용·지연 절감).
  추가로 `Article.url @unique` upsert로 DB 레벨 이중 방지.
- 향후: 임베딩 유사도 기반 cross-outlet 중복 감지 추가 예정
