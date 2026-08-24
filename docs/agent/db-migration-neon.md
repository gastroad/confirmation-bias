# DB 마이그레이션: Supabase → Neon

**✅ 완료 (2026-08-24).** 이 문서는 실행 기록이자 롤백 절차다.

## 왜 옮겼나

Supabase Free의 **storage 500MB / egress 5GB월**에 동시에 몰려 있었다.
egress는 2026-07-08에 28GB로 한도를 5배 넘겨 cron을 매시간→6시간마다로 늦춰야 했고
(수집 누락을 감수한 것), storage도 272MB로 절반을 넘긴 상태였다.
Neon은 egress를 사실상 제한하지 않아 **수집 주기를 다시 좁힐 수 있다**는 게 핵심 동기다.

## 사전 확인 (결합도 없음)

- 우리 데이터는 `public` 스키마의 **Article / Cluster / Outlet 3개 테이블뿐**.
  Supabase가 깔아둔 `auth`·`storage`·`realtime`·`vault` 스키마는 우리가 쓰지 않는다.
- 확장 의존성 없음. `@default(uuid())`는 Prisma 클라이언트가 앱에서 생성하므로
  `uuid-ossp`·`pgcrypto`가 없어도 된다.
- 따라서 **`server/db.ts`·`prisma.config.ts`·`schema.prisma`는 한 줄도 바뀌지 않았다.**
  `@prisma/adapter-pg`가 Neon에 그대로 붙는다. 바뀐 건 연결 문자열뿐.

## 버전 사실

|           | Supabase               | Neon                       |
| --------- | ---------------------- | -------------------------- |
| Postgres  | 17.6                   | **18.6**                   |
| region    | `ap-northeast-2`(서울) | `ap-southeast-1`(싱가포르) |
| collation | `en_US.UTF-8` (ICU)    | `C.UTF-8` (builtin)        |

로컬 `pg_dump`는 **18.6**(`brew install libpq`). 17.6 → 18.6은 상위 방향이라 안전하지만,
그래도 **덤프를 그대로 복원하지 않았다** — 아래 방식 참조.

## 실행 방식: 스키마는 Prisma, 데이터만 COPY

`pg_dump` 전체 덤프를 복원하면 서버 버전·소유자·확장에 묶인다. 대신:

1. `DIRECT_URL=<neon> npx prisma db push` — 스키마는 Prisma가 만든다 (버전 무관)
2. `pg_dump --data-only --no-owner --no-privileges` → `psql` — 데이터만 COPY

FK 때문에 **Outlet → Cluster → Article 순서**로 옮긴다. `pg_dump`는 `--table` 나열 순서가 아니라
자체 순서로 뱉으므로 테이블별로 분리해 실행한다.

스크립트: `scripts/migrate-to-neon.sh` (일회성. 재실행하면 데이터가 중복된다)

## 검증: `npm run db:verify`

`scripts/verify-db.ts`가 지문을 뽑아 이관 전후를 대조한다.
**해시를 전부 Postgres 안에서 계산**하는 게 핵심 — 23,861건 임베딩을 앱으로 퍼오면
검증 한 번에 egress가 수백 MB다.

```bash
npm run db:verify                                  # 현재 DATABASE_URL
VERIFY_DATABASE_URL='<다른 DB>' npm run db:verify   # 비교 대상
```

실측 결과 (양쪽 일치):

```
outlets 15 · clusters 11,376 · articles 23,861
outletHash      bc06b5231f62effcce5fbd3d8c5819c3
clusterHash     ca7729efe52229cd8b2f857210b5bdab
articleUrlHash  ba10707ce8d63ed93eaad2303575f59f
embeddingHash   3a4a2ffd825fa96a92d4d4a3f685f6d1
centroidHash    9ce7388003397f68055b272db489958d
```

### ⚠️ collation 함정

처음엔 `articleUrlHash`만 갈렸다. 원인은 데이터가 아니라 **정렬 규칙**이었다 —
그 해시만 `order by url`(텍스트 정렬)이었고 Supabase는 `en_US.UTF-8`, Neon은 `C.UTF-8`이다.
Supabase에서 `order by url collate "C"`로 다시 계산하니 Neon 값과 정확히 일치했다.

→ **검증 쿼리의 `order by`는 전부 `id` 기준으로 바꿨다.** 크로스 DB 대조에서 텍스트 정렬은 쓰면 안 된다.

## 함께 잡은 것: Vercel 함수 리전

이관하면서 프로덕션 TTFB가 **500~725ms**인 걸 발견했다. 원인은 DB가 아니라
**`vercel.json`이 없어 함수가 기본값 `iad1`(워싱턴)에서 돌고 있던 것**이다. DB는 서울이었으니
쿼리마다 태평양을 왕복하고 있었다.

```json
{ "regions": ["sin1"] }
```

Neon이 싱가포르이므로 함수도 `sin1`으로 고정했다. 확인은 응답 헤더로:

```bash
curl -sSI https://www.confirmationbias.app/ | grep x-vercel-id
# x-vercel-id: icn1::sin1::...
#              ^edge  ^함수 리전 ← 여기가 sin1이어야 한다
```

## 롤백 플랜

Supabase 프로젝트를 **2026-09-07까지 유지**한다. 되돌리려면:

1. `.env`의 `DATABASE_URL`/`DIRECT_URL`을 `SUPABASE_*` 값으로 되돌린다 (같은 파일에 보존돼 있다)
2. GitHub Actions Secrets·Vercel 환경변수의 `DATABASE_URL`도 동일하게
3. `vercel.json`의 `regions`를 `["icn1"]`로 (Supabase가 서울이므로)

이관 이후 Neon에 쌓인 신규 기사는 유실되므로, 롤백 시엔 그 구간을 재수집해야 한다.

## 체크리스트 — ✅ 완료(2026-08-24)

- [x] Neon 프로젝트 생성 (싱가포르) — 사용자
- [x] `brew install libpq` (pg_dump 18.6)
- [x] `scripts/verify-db.ts` 작성 + Supabase 기준선 확보
- [x] `prisma db push`로 Neon 스키마 생성
- [x] 데이터 COPY (Outlet → Cluster → Article, 261MB)
- [x] 지문 대조 통과
- [x] 로컬 `.env` 전환 (+ `SUPABASE_*`로 이전 값 보존)
- [x] `vercel.json` 함수 리전 `sin1` 고정
- [x] 로컬 dev 스모크 (홈·`/api/clusters/stats`·클러스터 상세 200)
- [ ] GitHub Actions Secrets `DATABASE_URL` 교체 — **사용자**
- [ ] Vercel 환경변수 `DATABASE_URL` 교체 — **사용자**
- [ ] 프로덕션 배포 후 `x-vercel-id` 함수 리전이 `sin1`인지 확인
- [ ] 2026-09-07 이후: Supabase 프로젝트 삭제 + `.env`의 `SUPABASE_*` 제거
