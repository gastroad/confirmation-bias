# 캐싱

**도입 2026-08-24.** 목적은 응답 속도보다 **Neon compute 절감**이다. Neon은 compute-hour 과금이라
DB 왕복 횟수가 곧 비용이다.

## 페이지 단위 `revalidate`를 쓰지 않는 이유

헤더의 프로필 메뉴가 모든 페이지에서 세션(쿠키)을 읽는다. **쿠키를 읽는 순간 페이지는 동적이
되어 `export const revalidate`가 무력화된다.** 그래서 페이지가 아니라 **데이터**를 캐시한다.

## 캐시는 DTO 경계에 건다 — 쿼리 레벨이 아니라

`unstable_cache`는 **반환값을 JSON 직렬화한다.** Prisma row를 그대로 캐시하면 `Date`가 문자열로
돌아와 이런 게 깨진다:

```
TypeError: e.bucketDate.toISOString is not a function
```

DTO(`toClusterSummary` 등)는 이미 ISO 문자열이라 직렬화가 안전하다. 그래서 **`server/queries/*`는
캐시하지 않고**, API 라우트·서버 컴포넌트에서 DTO로 바꾼 뒤 캐시한다.

`Date`를 주고받아야 하면 ISO 문자열로 바꿔 경계를 넘긴다(`src/app/_day-nav-data.ts` 참고).

## DTO 모양이 바뀌면 `DTO_VERSION`을 올린다

**캐시 키에는 인자만 들어가고 반환 타입은 들어가지 않는다.** DTO에 필드를 추가·삭제해도 키가
그대로면 배포 후에도 **옛 모양의 응답이 TTL이 끝날 때까지 서빙된다.** 새 클라이언트가 없는
필드를 읽어 `undefined`가 되고, 화면에는 `NaN`이나 빈칸이 뜬다.

`server/cache.ts`의 `DTO_VERSION`을 모든 `unstable_cache` 키에 넣어 뒀다. DTO를 바꾸는 PR은
이 값을 함께 올린다.

```ts
export const DTO_VERSION = "v6";
// ...
unstable_cache(fn, ["clusters-page", DTO_VERSION], { ... });
```

### 2026-08-25 사고

`ClusterSummary`에 `tilt`·`outletCount`를 추가하면서 키를 올리지 않아 프로덕션 목록이
`보수 +NaN`으로 떴다. 배포 검증 때 `/api/clusters`만 확인했는데 **홈이 실제로 부르는 건
`/api/clusters?date=YYYY-MM-DD`였고, 인자가 다르면 캐시 항목도 다르다.** 앞의 것은 아무도
채운 적이 없어 새로 계산돼 멀쩡했고, 뒤의 것만 옛 모양이었다.

- 배포 후에는 **화면이 실제로 부르는 URL**로 확인한다. 파라미터 없는 요청은 다른 캐시 항목이다.
- TTL이 목록 1시간·상세 6시간이라 그냥 두면 그 시간 내내 깨진 화면이 보인다.

## ⚠️ 태그는 달려 있지만 아무도 무효화하지 않는다 (2026-10-22 발견)

`"clusters"`·`"days"` 태그가 **9곳**의 `unstable_cache`에 선언돼 있는데 **`revalidateTag`를
부르는 코드가 한 줄도 없다.** `revalidatePath`는 `/admin/*`에만 쓰인다.

파이프라인(`collect.yml`·`cluster-daily.yml`)은 **GitHub Actions에서 DB에 직접 쓴다.** 배포된
Next 앱을 거치지 않으므로 앱은 데이터가 바뀐 것을 알 길이 없다. 결과적으로 **유일한 갱신
수단이 시간 기반 `revalidate`**다.

동적 페이지는 그래도 돈다(TTL 1시간). 그런데 **정적 프리렌더 라우트는 멈춘다** —
`sitemap.xml`이 빌드 시점(2026-09-07) 값으로 **45일간 고정**돼 있었다. 홈 엔트리의
`lastModified`가 `new Date()`라 렌더 시각이 박히는데 그게 그 배포의 빌드 시각이었다.

```bash
# 라이브 sitemap이 언제 렌더된 것인지 — 홈 엔트리의 lastmod가 곧 렌더 시각이다
curl -s https://www.confirmationbias.app/sitemap.xml | grep -A1 '<loc>https://www.confirmationbias.app</loc>'
```

→ 조치는 [adsense-compliance.md](./adsense-compliance.md)의 **P0-7**에 있다(파이프라인이 끝나면
무효화 라우트를 호출 + sitemap을 정적에서 빼기).

**새 캐시에 태그를 달 때 이걸 기억한다.** 태그는 무효화 호출이 있을 때만 의미가 있다.
호출부가 없으면 태그는 주석일 뿐이고, 실제 수명은 `revalidate` 값 하나로 정해진다.

## 어디에 무엇을

| 위치                             | 캐시 대상       | TTL |
| -------------------------------- | --------------- | --- |
| `src/app/_cluster-data.ts`       | 목록 · 집계 DTO | 1h  |
| `src/app/api/days/route.ts`      | 날짜 목록 DTO   | 1h  |
| `src/app/clusters/[id]/page.tsx` | 상세 DTO        | 6h  |
| `src/app/sitemap.ts`             | 사이트맵 항목   | 6h  |
| `src/app/_day-nav-data.ts`       | 날짜 내비       | 1h  |

### 목록·집계 캐시는 라우트가 아니라 `_cluster-data.ts`에 있다 (2026-10-22 이동)

전엔 `api/clusters/route.ts`·`api/clusters/stats/route.ts`가 각자 `unstable_cache`를 들고
있었다. 첫 화면을 서버에서 그리기 시작하면서(→ [adsense-compliance.md](./adsense-compliance.md)의
P0-5) **서버 컴포넌트와 API 라우트가 같은 데이터를 쓰게** 됐는데, 캐시가 라우트 파일 안에
있으면 두 경로가 각자 캐시 항목을 만들어 같은 값을 DB에서 두 번 읽는다.

키(`clusters-page`·`clusters-stats`)와 TTL은 그대로 옮겼으므로 **캐시 항목은 갈리지 않는다.**
`_feed-seed.ts`(SSR)와 두 라우트가 이 한 모듈을 부른다.

수명은 `server/cache.ts`의 `CACHE_TTL`에 모아 둔다.

**댓글은 캐시하지 않는다** — 작성 즉시 보여야 한다.

상세 페이지는 두 겹이다: `unstable_cache`(요청 간) + React `cache`(요청 안 중복 제거 —
`generateMetadata`와 렌더가 같은 값을 쓴다).

## 세션 왕복 단축

측정해보니 **병목은 DB가 아니라 세션 조회였다.** DB를 전혀 안 치는 `/privacy`가 85ms였다.
SDK가 세션을 확인하려고 인증 서버를 왕복하기 때문이다.

세션 쿠키가 **아예 없으면** 결과가 null인 게 확실하므로 왕복하지 않는다
(`server/session-cookie.ts`). 방문자 대부분이 비로그인이라 체감이 크다.

```
/privacy 비로그인:  85ms → 5ms
```

⚠️ **쿠키 이름에 `__Secure-` 접두어가 붙는다**(HTTPS). 처음에 `startsWith`로 짚었다가 **로그인한
사용자가 비로그인으로 보이는** 버그를 냈다. 화면상 조용히 틀리는 종류라 `session-cookie.test.ts`가
회귀를 막는다.

## 실측 (프로덕션 빌드, 2026-08-24)

| 엔드포인트            | 첫 요청 | 이후        |
| --------------------- | ------- | ----------- |
| `/api/clusters`       | 167ms   | **1.4~4ms** |
| `/api/days`           | 82ms    | **0.9~2ms** |
| `/privacy` (비로그인) | 85ms    | **5ms**     |

## 무효화

TTL 만료로만 갱신된다. 클러스터링은 GitHub Actions에서 돌아 **Next 런타임 밖이라
`revalidateTag`를 부를 수 없다.**

실용적으로 문제가 없다: 클러스터링은 하루 1회 KST 05:00에 돌고 TTL이 최대 6시간이라
늦어도 오전 중에는 새 데이터가 보인다. `tags`는 붙여 뒀으니 나중에 웹훅 등으로
무효화를 붙일 수 있다.

## 하지 않은 것: Cache Components

Next 16은 `use cache`(= `cacheComponents: true`)를 권한다. **시도했다가 되돌렸다.**

켜면 세그먼트 설정(`dynamic`·`revalidate`)이 전부 금지되고, `cookies()`를 읽는 모든 페이지를
`<Suspense>`로 재구조화해야 하며, Server Component의 `new Date()`도 에러가 된다. 앱 전체의
렌더링 모델을 바꾸는 전환이라 **"DB 왕복을 줄인다"는 이 작업의 목적에 비해 수단이 크다.**

`unstable_cache`는 deprecated 표시가 있지만 Next 16에서 동작한다. Cache Components 전환은
별도 과제로 남긴다.
