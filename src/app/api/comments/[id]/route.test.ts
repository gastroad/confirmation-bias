// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

const getSessionUser = vi.hoisted(() => vi.fn());
const deleteComment = vi.hoisted(() => vi.fn());

vi.mock("@server/auth", () => ({ getSessionUser }));
vi.mock("@server/queries/comments", () => ({ deleteComment }));

const { DELETE } = await import("./route");

const ctx = (id = "cm-1") => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost:3000/api/comments/cm-1", { method: "DELETE" });

const user = (over: Partial<{ id: string; role: string }> = {}) => ({
  id: "user-1",
  email: "me@example.com",
  name: "홍길동",
  role: "user",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  getSessionUser.mockResolvedValue(null);
  deleteComment.mockResolvedValue(1);
});

describe("DELETE /api/comments/[id]", () => {
  it("비로그인은 401이고 DB를 건드리지 않는다", async () => {
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(401);
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it("성공하면 204 (본문 없음)", async () => {
    getSessionUser.mockResolvedValue(user());
    const res = await DELETE(req(), ctx("cm-9"));

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(deleteComment).toHaveBeenCalledWith("cm-9", { id: "user-1", isAdmin: false });
  });

  it("권한 판정을 쿼리에 넘긴다 — 라우트가 직접 판단하지 않는다", async () => {
    getSessionUser.mockResolvedValue(user({ id: "admin-1", role: "admin" }));
    await DELETE(req(), ctx());
    expect(deleteComment).toHaveBeenCalledWith("cm-1", { id: "admin-1", isAdmin: true });
  });

  it("role이 admin이 아니면 전부 일반 사용자다", async () => {
    for (const role of ["user", "moderator", "", "ADMIN"]) {
      getSessionUser.mockResolvedValue(user({ role }));
      await DELETE(req(), ctx());
      expect(deleteComment.mock.calls.at(-1)![1].isAdmin).toBe(false);
    }
  });

  it("0건 삭제는 404다 — 없는 것과 남의 것을 **구분해 알려주지 않는다**", async () => {
    // 구분하면 "그 id의 댓글이 존재하는가"가 새어 나간다.
    getSessionUser.mockResolvedValue(user());
    deleteComment.mockResolvedValue(0);

    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "삭제할 수 없습니다." });
  });

  it("존재하지 않는 댓글과 남의 댓글이 **같은 응답**을 낸다", async () => {
    getSessionUser.mockResolvedValue(user());
    deleteComment.mockResolvedValue(0);

    const missing = await DELETE(req(), ctx("does-not-exist"));
    const forbidden = await DELETE(req(), ctx("someone-elses"));

    expect(missing.status).toBe(forbidden.status);
    expect(await missing.json()).toEqual(await forbidden.json());
  });
});
