import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon Auth(= Managed Better Auth). **SDK에 직접 의존하는 곳은 이 파일 하나로 묶는다.**
// 0.5.0-beta라 breaking change가 올 수 있고, self-hosted Better Auth로 갈아탈 여지도
// 남겨야 한다. 나머지 코드는 아래 getSessionUser/isAdmin 만 본다.

/**
 * 인증 환경변수가 갖춰졌는지. **인스턴스를 모듈 최상위에서 만들지 않는 이유가 여기 있다** —
 * 그렇게 하면 환경변수가 없는 환경에서 `next build`가 통째로 실패해, 인증과 무관한
 * 뉴스 대시보드까지 배포할 수 없게 된다. 인증은 부가 기능이므로 없으면 그 기능만 죽는다.
 */
export const AUTH_CONFIGURED = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
);

let instance: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth(): ReturnType<typeof createNeonAuth> {
  if (!AUTH_CONFIGURED) {
    throw new Error("인증이 설정되지 않았습니다 (NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET)");
  }
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return instance;
}

export type Role = "user" | "admin";

/** 앱이 쓰는 세션 형태. SDK 타입을 그대로 흘리지 않는다. */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

function toSessionUser(user: {
  id: string;
  email: string;
  name?: string | null;
  role?: unknown;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    // admin 플러그인이 role을 실어 준다. 값이 "admin"이 아닌 모든 경우를 최소 권한으로
    // 떨어뜨린다 — SDK가 필드를 바꾸거나 없애도 권한이 새어 나가지 않게.
    role: user.role === "admin" ? "admin" : "user",
  };
}

/** 인증 미설정이면 "비로그인"으로 취급한다(예외를 던지지 않는다). */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!AUTH_CONFIGURED) return null;
  const { data } = await getAuth().getSession();
  return data?.user ? toSessionUser(data.user) : null;
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}
