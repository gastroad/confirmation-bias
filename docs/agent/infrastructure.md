# Infrastructure

> 외부 서비스(OpenAI·Vercel·Supabase·GitHub) 계정·시크릿·점검 지점은
> [external-services.md](./external-services.md) 참고.

## 현재 상태

| 항목   | 현재 값                                    |
| ------ | ------------------------------------------ |
| DB     | Supabase (Postgres), region ap-northeast-2 |
| ORM    | Prisma v7 + `@prisma/adapter-pg`           |
| 임베딩 | OpenAI `text-embedding-3-small`, 512차원   |
| 호스팅 | Vercel (Hobby) — Next.js 서빙만 담당       |

> SQLite → Supabase 전환 완료(2026-06-29). 롤백용 `dev.db.bak-*`는 로컬에만 보관(gitignore).

## 환경변수 (`.env`)

```
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true  # 앱 런타임(pooler)
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres                    # 스키마 push/migrate(direct)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SITE_URL=https://confirmationbias.app  # (선택) SEO canonical/OG의 절대 URL. 미설정 시 프로덕션 도메인으로 폴백
```

- **`DATABASE_URL`(6543, pgbouncer)** — 앱 런타임. `server/db.ts`의 `PrismaPg` 어댑터가 사용.
- **`DIRECT_URL`(5432, session)** — `prisma db push`/migrate용. pgbouncer 트랜잭션 풀러로는 DDL이 깨져
  `prisma.config.ts`가 이쪽을 가리킨다.
- Supabase Connect → ORMs → Prisma 에서 두 문자열을 복사. 비밀번호 자리(`[YOUR-PASSWORD]`)의
  **대괄호까지 함께 치환**해야 함(대괄호 잔존 시 P1000 인증 실패).

`scripts/`와 `prisma/` 스크립트는 `--env-file=.env` 로 로드.  
Next.js는 자동으로 `.env` 로드.

### Vercel(웹 호스트)에 필요한 시크릿

- **`DATABASE_URL`만 필요.** OpenAI는 `server/clustering/*`(embed·llm-judge)에서만 쓰이고
  이는 ingest 파이프라인(GitHub Actions)만 import하므로, 웹 런타임엔 `OPENAI_API_KEY` 불필요.
- **`DIRECT_URL`도 Vercel엔 불필요.** 마이그레이션은 GitHub Actions/로컬에서만 수행.

## Prisma 주의사항

- 생성된 클라이언트는 `src/generated/prisma/` (gitignore됨)
- 코드 변경 후 반드시 `npm run db:generate` 실행 (CI에서도 자동 실행됨)
- **Vercel 빌드는 스텝을 못 끼우므로 `build` 스크립트가 `prisma generate && next build`.**
  생성물이 gitignore라 이게 없으면 클라이언트 부재로 빌드 실패.
- 스키마 파일: `prisma/schema.prisma`
- Prisma 런타임 설정: `prisma.config.ts` (CLI용 datasource URL = `DIRECT_URL` 주입)

## RSS 자동 수집 스케줄 (가동 중)

- `.github/workflows/pipeline.yml`가 **6시간마다** `collect → ingest` 자동 실행 (2026-06-29~,
  2026-07-08 매시간→6시간마다 완화: Supabase egress 초과 대응. `pipeline-scheduling.md` 참조).
- `data/new-articles.json`은 collect→ingest 간 임시 중간 파일. gitignore라 ingest는
  정적 import가 아니라 **런타임에 읽는다**(빌드/타입체크 시점엔 부재). 향후 DB 직접 append로 대체 예정.

## Supabase egress 관리

- **원인:** ingest가 기사마다 최근 클러스터 centroid(≈10KB/건, 512-dim JSON)를 전부 재조회해
  `O(신규기사 × 최근클러스터)`로 egress가 폭증 → 5GB/월 한도를 크게 초과(28GB, 2026-07-08).
- **대응:** ① cron 매시간→6시간마다 완화, ② `loadRecentClusters()`로 centroid를 **run당 1회만**
  로드해 메모리에서 갱신(`server/clustering/cluster.ts`), ③ ingest의 write들에 `select`를 걸어
  응답이 centroid·embeddingJson을 되싣지 않게 함.
- **향후:** centroid를 pgvector로 옮겨 유사도를 DB에서 계산하면 벡터를 앱으로 퍼내는 egress 자체가 사라짐.

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

## 중복 뉴스 제거

- 현재: ingest가 **임베딩 전에 기존 URL을 일괄 조회해 제외** → 신규 기사만 임베딩(비용·지연 절감).
  추가로 `Article.url @unique` upsert로 DB 레벨 이중 방지.
- 향후: 임베딩 유사도 기반 cross-outlet 중복 감지 추가 예정
