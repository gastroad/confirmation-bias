import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon Auth(= Managed Better Auth) 인스턴스. **SDK에 직접 의존하는 곳은 이 파일 하나로 묶는다.**
// 0.5.0-beta라 breaking change가 올 수 있고, 나중에 self-hosted Better Auth로 갈아탈 여지도
// 남겨야 한다. 나머지 코드는 아래 getSessionUser/requireAdmin 만 보게 한다.
export const auth = createNeonAuth({
  baseUrl: requiredEnv("NEON_AUTH_BASE_URL"),
  cookies: { secret: requiredEnv("NEON_AUTH_COOKIE_SECRET") },
});

function requiredEnv(key: string): string {
  const value = process.env[key];
  // 빌드 타임엔 없을 수 있으나 런타임에 없으면 인증이 조용히 깨지므로 즉시 알린다.
  if (!value) throw new Error(`${key}가 설정되지 않았습니다`);
  return value;
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
    // admin 플러그인이 붙어 있으면 role이 실려 온다. 없거나 값이 이상하면 최소 권한으로 떨어뜨린다.
    role: user.role === "admin" ? "admin" : "user",
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const { data } = await auth.getSession();
  return data?.user ? toSessionUser(data.user) : null;
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}
