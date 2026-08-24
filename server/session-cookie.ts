// 세션 쿠키 존재 판정. **SDK를 import하지 않는 순수 함수**라 단위 테스트가 가능하다
// (server/auth.ts는 @neondatabase/auth를 끌어와 테스트 환경에서 next/headers 해석이 깨진다).
const SESSION_COOKIE = "neon-auth.session_token";

/**
 * 세션 쿠키가 하나라도 있는지. HTTPS에서는 `__Secure-` 접두어가 붙으므로 부분 일치로 찾는다.
 *
 * 이름을 잘못 짚으면 **로그인한 사용자가 비로그인으로 보인다** — 화면상 조용히 틀리는 종류다.
 */
export function hasSessionCookie(names: readonly string[]): boolean {
  return names.some((n) => n.includes(SESSION_COOKIE));
}
