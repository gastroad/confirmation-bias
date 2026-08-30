import { describe, it, expect } from "vitest";
import { toComment } from "./lib";

// canDelete는 **권한 판정**이다. 서버가 계산해 내려주고 클라이언트는 버튼 노출에만 쓴다
// (실제 삭제는 server/queries/comments.ts의 where 절이 다시 검사한다).
// 여기가 느슨해지면 지울 수 없는 버튼이 보이거나, 지울 수 있는 걸 못 지운다.
const row = (over: Partial<Parameters<typeof toComment>[0]> = {}) => ({
  id: "cm1",
  authorId: "user-1",
  authorName: "홍길동",
  body: "내용",
  createdAt: new Date("2026-08-26T05:00:00.000Z"),
  ...over,
});

const me = { id: "user-1", isAdmin: false };
const other = { id: "user-2", isAdmin: false };
const admin = { id: "user-9", isAdmin: true };

describe("toComment — 필드 매핑", () => {
  it("createdAt을 ISO 문자열로 바꾼다", () => {
    expect(toComment(row(), null).createdAt).toBe("2026-08-26T05:00:00.000Z");
  });

  it("본문과 작성자명을 가공하지 않는다", () => {
    const c = toComment(row({ authorName: "  공백  ", body: "줄\n바꿈" }), null);
    expect(c.authorName).toBe("  공백  ");
    expect(c.body).toBe("줄\n바꿈");
  });

  it("JSON 왕복에도 값이 보존된다", () => {
    const c = toComment(row(), me);
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
  });
});

describe("toComment — canDelete", () => {
  it("비로그인은 무엇도 지울 수 없다", () => {
    expect(toComment(row(), null).canDelete).toBe(false);
  });

  it("본인 댓글은 지울 수 있다", () => {
    expect(toComment(row({ authorId: "user-1" }), me).canDelete).toBe(true);
  });

  it("남의 댓글은 지울 수 없다", () => {
    expect(toComment(row({ authorId: "user-1" }), other).canDelete).toBe(false);
  });

  it("관리자는 남의 댓글도 지울 수 있다", () => {
    expect(toComment(row({ authorId: "user-1" }), admin).canDelete).toBe(true);
  });

  it("탈퇴한 작성자(authorId=null)의 댓글은 일반 사용자가 지울 수 없다", () => {
    // authorId가 null이면 "내 것"이 성립하지 않는다. null === null로 통과시키면
    // 탈퇴자 댓글이 **모든 로그인 사용자에게** 삭제 가능해진다.
    expect(toComment(row({ authorId: null }), me).canDelete).toBe(false);
    expect(toComment(row({ authorId: null }), other).canDelete).toBe(false);
  });

  it("탈퇴한 작성자의 댓글도 관리자는 지울 수 있다 — 관리 수단이 남아야 한다", () => {
    expect(toComment(row({ authorId: null }), admin).canDelete).toBe(true);
  });

  it("canDelete는 항상 boolean이다 — authorId 문자열이 새어 나가지 않는다", () => {
    // Boolean()을 빼면 `row.authorId && ...`가 null이나 문자열을 그대로 돌려준다.
    for (const viewer of [null, me, other, admin]) {
      for (const authorId of ["user-1", null]) {
        expect(typeof toComment(row({ authorId }), viewer).canDelete).toBe("boolean");
      }
    }
  });
});
