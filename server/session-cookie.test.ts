import { describe, it, expect } from "vitest";
import { hasSessionCookie } from "./session-cookie";

// 세션 왕복(~80ms)을 건너뛰는 단축 경로의 판정. 이름을 잘못 짚으면 **로그인한 사용자가
// 비로그인으로 보인다** — 화면상 조용히 틀리는 종류라 회귀 테스트로 고정한다.
describe("hasSessionCookie", () => {
  it("__Secure- 접두어가 붙어도 찾는다 (HTTPS에서 실제로 이렇게 온다)", () => {
    expect(hasSessionCookie(["__Secure-neon-auth.session_token"])).toBe(true);
  });

  it("접두어 없는 이름도 찾는다", () => {
    expect(hasSessionCookie(["neon-auth.session_token"])).toBe(true);
  });

  it("다른 쿠키와 섞여 있어도 찾는다", () => {
    expect(
      hasSessionCookie([
        "cb-theme",
        "__Secure-neon-auth.local.session_data",
        "__Secure-neon-auth.session_token",
      ])
    ).toBe(true);
  });

  it("세션 쿠키가 없으면 false (여기서 왕복을 건너뛴다)", () => {
    expect(hasSessionCookie([])).toBe(false);
    expect(hasSessionCookie(["cb-theme", "_ga"])).toBe(false);
  });

  it("세션 데이터 쿠키만 있는 것으로는 로그인으로 보지 않는다", () => {
    expect(hasSessionCookie(["__Secure-neon-auth.local.session_data"])).toBe(false);
  });
});
