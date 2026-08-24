# 인증 (Neon Auth)

**도입 2026-08-24.** Neon Auth = Neon이 관리형으로 제공하는 **Better Auth**다.
Neon을 이미 DB로 쓰고 있어 인증만 따로 굴릴 이유가 없었다.

## ⚠️ 베타

`@neondatabase/auth`는 **0.5.0-beta**다. 알고 채택했다. 그래서 **SDK에 직접 의존하는 코드를
`server/auth.ts` 한 파일로 가둔다.** 나머지 코드는 우리가 정의한 `SessionUser`/`Role`만 본다.
self-hosted Better Auth로 갈아타야 할 때 이 파일만 바꾸면 되도록.

**호출부에서 `@neondatabase/auth`를 직접 import하지 말 것.**

## 구성

| 위치                                  | 역할                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `server/auth.ts`                      | `createNeonAuth` 인스턴스 + `getSessionUser()`·`isAdmin()` 래퍼. **SDK 의존은 여기까지** |
| `server/github.ts`                    | `workflow_dispatch` 호출 (관리자 트리거용)                                               |
| `src/proxy.ts`                        | 라우트 보호. **Next 16에서 `middleware.ts` → `proxy.ts`로 규약이 바뀌었다**              |
| `src/app/api/auth/[...path]/route.ts` | `auth.handler()` — 로그인·가입·OAuth 콜백·세션 갱신                                      |
| `src/app/auth/`                       | `layout.tsx`(로그인 시 홈으로) · `sign-in` · `sign-up` · `actions.ts`                    |
| `src/features/auth-form/`             | 로그인·가입 폼 (`useActionState`)                                                        |
| `src/features/auth-menu/`             | 헤더의 로그인/로그아웃·관리 링크                                                         |
| `src/app/admin/`                      | 관리자 전용. 수집·클러스터링 수동 트리거                                                 |

**클라이언트 SDK를 쓰지 않는다.** 로그인·가입·로그아웃 모두 Server Action이라
`@neondatabase/auth`가 클라이언트 번들에 들어가지 않는다.

## role — `AppUser` 테이블은 만들지 않았다

설계 초안에는 `role`을 담을 `AppUser` 테이블이 있었으나 **불필요**했다.
Neon Auth에 Better Auth의 admin 플러그인이 켜져 있어 세션 user에 role이 실려 온다:

```json
{ "email": "...", "role": "user", "banned": false, "banExpires": null }
```

`neon_auth."user"` 테이블에 `role text` 컬럼이 있고, SDK는 `auth.admin.setRole()`을 제공한다.

**단, `setRole()`은 호출자가 이미 admin이어야 해서 최초 1명은 만들 수 없다.**
그래서 부트스트랩 스크립트를 둔다:

```bash
npm run grant:admin -- you@example.com
npm run grant:admin -- you@example.com --revoke
```

role은 **로그인 시점에 세션에 굳는다.** 승격 후 이미 로그인 중이라면 다시 로그인해야 반영된다.

`server/auth.ts`의 `toSessionUser`는 role이 `"admin"`이 아닌 모든 값을 `"user"`로 떨어뜨린다.
SDK가 값을 바꾸거나 필드가 사라져도 권한이 새어 나가지 않게 하기 위해서다.

## 권한 검사는 두 겹

1. `src/proxy.ts` — `/admin/:path*` 비로그인 접근을 `/auth/sign-in`으로 (307)
2. `src/app/admin/actions.ts` — **Server Action 안에서 다시 확인**

2번이 필요한 이유: Server Action은 URL과 무관하게 호출될 수 있어 proxy를 우회한다.
수집 트리거는 OpenAI 비용이 걸린 경로라 반드시 이중으로 막는다.

`next/navigation`의 `forbidden()`은 **experimental(`authInterrupts` 플래그)이라 쓰지 않았다.**
권한 부족은 화면에서 그대로 안내한다.

## `neon_auth` 스키마

Neon이 만들고 관리한다. Prisma 스키마 밖이므로 마이그레이션 대상이 아니다.

```
account · invitation · jwks · member · organization · project_config · session · user · verification
```

`session` 테이블에 `ipAddress`·`userAgent`가 저장된다 — 개인정보처리방침에 명시했다.

## 환경변수

| 키                        | 어디서              | 비고                                       |
| ------------------------- | ------------------- | ------------------------------------------ |
| `NEON_AUTH_BASE_URL`      | Neon Console → Auth | **Auth URL**을 넣는다. JWKS URL이 아니다   |
| `NEON_AUTH_COOKIE_SECRET` | 직접 생성           | `openssl rand -base64 32`                  |
| `GITHUB_DISPATCH_TOKEN`   | GitHub PAT          | `/admin` 트리거용. Actions: Read and write |

> **Vercel 환경변수 전제가 깨졌다.** 그동안 웹 런타임은 `DATABASE_URL` 하나면 됐지만,
> 이제 위 세 개가 더 필요하다. 누락하면 **프로덕션에서만** 터진다.

## 인스턴스를 모듈 최상위에서 만들지 않는다

`server/auth.ts`는 `createNeonAuth`를 **요청 시점에 lazy로** 만든다(`getAuth()`).
최상위에서 만들면 환경변수가 없는 환경의 `next build`가 통째로 실패해 **인증과 무관한
뉴스 대시보드까지 배포할 수 없게 된다** — 실제로 Vercel 프리뷰가 이 이유로 실패했다.

인증은 부가 기능이므로 미설정 시 그 기능만 죽는다.

| 지점               | 미설정일 때                                                 |
| ------------------ | ----------------------------------------------------------- |
| `getSessionUser()` | `null` (= 비로그인 취급). 예외를 던지지 않는다              |
| `/api/auth/*`      | 503                                                         |
| `proxy.ts`         | 통과 (`/admin`은 페이지가 권한을 다시 보므로 열리지 않는다) |
| 로그인·가입 액션   | 폼에 "인증이 설정되지 않았습니다"                           |

## 빌드 주의

`/auth/*`는 세션 확인에 쿠키를 읽어 어차피 동적이다. `layout.tsx`에 `dynamic = "force-dynamic"`을
명시하지 않으면 빌드가 정적 렌더를 시도하다 실패하면서 SDK가 `Cookie validation error`를
로그에 쏟아낸다(빌드는 성공하지만 로그가 더러워진다).

## 확인된 동작 (2026-08-24)

가입 → 세션 발급(쿠키 `neon-auth.session_token`) → `grant:admin` → 재로그인 →
세션 role=admin → `/admin` 200. 비로그인 `/admin` 접근은 307 리다이렉트.

## 남은 것

- 소셜 로그인(`auth.signIn.social`) — SDK는 지원. Neon Console에서 프로바이더 설정 필요
- 이메일 인증(`sendVerificationEmail`) — 현재 `emailVerified: false`로 가입되며 강제하지 않는다
- 회원 탈퇴 UI — `auth.deleteUser()`가 있으나 화면은 아직 없다.
  개인정보처리방침에 "탈퇴 요청 시 파기"로 적었으므로 **문의 경로로는 대응 가능하나 UI가 필요하다**
- 이용약관 — 회원가입이 생겼으므로 실질적으로 필요해졌다 (`launch-todo.md` P0)
