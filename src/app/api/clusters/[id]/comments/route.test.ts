// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MAX_COMMENT_LENGTH } from "@/entities/comment";

const getSessionUser = vi.hoisted(() => vi.fn());
const findComments = vi.hoisted(() => vi.fn());
const createComment = vi.hoisted(() => vi.fn());

vi.mock("@server/auth", () => ({ getSessionUser }));
vi.mock("@server/queries/comments", () => ({
  findComments,
  createComment,
  MAX_COMMENT_LENGTH: 1000,
}));

const { GET, POST } = await import("./route");

const ctx = (id = "cl-1") => ({ params: Promise.resolve({ id }) });
const getReq = () => new Request("http://localhost:3000/api/clusters/cl-1/comments");
const postReq = (body: unknown, raw?: string) =>
  new Request("http://localhost:3000/api/clusters/cl-1/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });

const row = (over: Partial<{ id: string; authorId: string | null; authorName: string }> = {}) => ({
  id: "cm1",
  authorId: "user-1",
  authorName: "홍길동",
  body: "댓글",
  createdAt: new Date("2026-08-26T05:00:00.000Z"),
  ...over,
});

const user = (over: Partial<{ id: string; role: string; name: string; email: string }> = {}) => ({
  id: "user-1",
  email: "me@example.com",
  name: "홍길동",
  role: "user",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  getSessionUser.mockResolvedValue(null);
  findComments.mockResolvedValue([]);
});

describe("GET — 목록", () => {
  it("비로그인도 읽을 수 있다", async () => {
    findComments.mockResolvedValue([row()]);
    const res = await GET(getReq(), ctx());

    expect(res.status).toBe(200);
    const [c] = await res.json();
    expect(c.body).toBe("댓글");
    expect(c.canDelete).toBe(false);
  });

  it("본인 댓글에는 canDelete가 붙는다 — 권한을 **서버가** 계산해 내려준다", async () => {
    getSessionUser.mockResolvedValue(user({ id: "user-1" }));
    findComments.mockResolvedValue([
      row({ id: "mine", authorId: "user-1" }),
      row({ id: "theirs", authorId: "user-2" }),
    ]);

    const body = await (await GET(getReq(), ctx())).json();
    expect(body.map((c: { id: string; canDelete: boolean }) => [c.id, c.canDelete])).toEqual([
      ["mine", true],
      ["theirs", false],
    ]);
  });

  it("관리자는 모든 댓글에 canDelete가 붙는다", async () => {
    getSessionUser.mockResolvedValue(user({ id: "admin-1", role: "admin" }));
    findComments.mockResolvedValue([row({ authorId: "user-2" })]);

    const [c] = await (await GET(getReq(), ctx())).json();
    expect(c.canDelete).toBe(true);
  });

  it("클러스터 id로 조회한다", async () => {
    await GET(getReq(), ctx("cl-99"));
    expect(findComments).toHaveBeenCalledWith("cl-99");
  });

  it("createdAt이 ISO 문자열이다", async () => {
    findComments.mockResolvedValue([row()]);
    const [c] = await (await GET(getReq(), ctx())).json();
    expect(c.createdAt).toBe("2026-08-26T05:00:00.000Z");
  });
});

describe("POST — 인증", () => {
  it("비로그인은 401이고 DB를 건드리지 않는다", async () => {
    const res = await POST(postReq({ body: "내용" }), ctx());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "로그인이 필요합니다." });
    expect(createComment).not.toHaveBeenCalled();
  });
});

describe("POST — 입력 검증", () => {
  beforeEach(() => {
    getSessionUser.mockResolvedValue(user());
    createComment.mockImplementation(
      async (input: { authorName: string; body: string; authorId: string }) =>
        row({ authorName: input.authorName })
    );
  });

  it("빈 본문은 400이다", async () => {
    const res = await POST(postReq({ body: "" }), ctx());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "내용을 입력해주세요." });
  });

  it("공백뿐인 본문도 400이다", async () => {
    expect((await POST(postReq({ body: "   \n\t " }), ctx())).status).toBe(400);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("body가 문자열이 아니면 400이다 — 타입을 신뢰하지 않는다", async () => {
    for (const bogus of [123, null, true, { a: 1 }, ["x"]]) {
      const res = await POST(postReq({ body: bogus }), ctx());
      expect(res.status).toBe(400);
    }
    expect(createComment).not.toHaveBeenCalled();
  });

  it("body 키가 아예 없어도 400이다", async () => {
    expect((await POST(postReq({}), ctx())).status).toBe(400);
  });

  it("JSON이 깨져 있어도 500이 아니라 400이다", async () => {
    const res = await POST(postReq(null, "{ not json"), ctx());
    expect(res.status).toBe(400);
  });

  it("앞뒤 공백을 잘라 저장한다", async () => {
    await POST(postReq({ body: "  내용  " }), ctx());
    expect(createComment).toHaveBeenCalledWith(expect.objectContaining({ body: "내용" }));
  });

  it("상한을 넘으면 400이고 상한값을 문구에 담는다", async () => {
    const res = await POST(postReq({ body: "가".repeat(MAX_COMMENT_LENGTH + 1) }), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(String(MAX_COMMENT_LENGTH));
    expect(createComment).not.toHaveBeenCalled();
  });

  it("정확히 상한까지는 통과한다 — 경계에서 한 글자를 잃지 않는다", async () => {
    const res = await POST(postReq({ body: "가".repeat(MAX_COMMENT_LENGTH) }), ctx());
    expect(res.status).toBe(201);
  });

  it("공백을 자른 뒤의 길이로 판정한다", async () => {
    const res = await POST(postReq({ body: `  ${"가".repeat(MAX_COMMENT_LENGTH)}  ` }), ctx());
    expect(res.status).toBe(201);
  });
});

describe("POST — 작성자 표시명", () => {
  beforeEach(() => {
    createComment.mockImplementation(async (input: { authorName: string }) =>
      row({ authorName: input.authorName })
    );
  });

  it("이름이 있으면 이름을 굳혀 저장한다 (neon_auth와 join할 수 없다)", async () => {
    getSessionUser.mockResolvedValue(user({ name: "홍길동" }));
    await POST(postReq({ body: "내용" }), ctx());
    expect(createComment).toHaveBeenCalledWith(expect.objectContaining({ authorName: "홍길동" }));
  });

  it("이름이 없으면 이메일 로컬파트만 쓴다 — 도메인을 노출하지 않는다", async () => {
    getSessionUser.mockResolvedValue(user({ name: "", email: "someone@gmail.com" }));
    await POST(postReq({ body: "내용" }), ctx());

    const { authorName } = createComment.mock.calls.at(-1)![0];
    expect(authorName).toBe("someone");
    expect(authorName).not.toContain("@");
    expect(authorName).not.toContain("gmail.com");
  });

  it("이름이 공백뿐이어도 이메일 로컬파트로 떨어진다", async () => {
    getSessionUser.mockResolvedValue(user({ name: "   ", email: "someone@gmail.com" }));
    await POST(postReq({ body: "내용" }), ctx());
    expect(createComment.mock.calls.at(-1)![0].authorName).toBe("someone");
  });

  it("이름의 앞뒤 공백을 자른다", async () => {
    getSessionUser.mockResolvedValue(user({ name: "  홍길동  " }));
    await POST(postReq({ body: "내용" }), ctx());
    expect(createComment.mock.calls.at(-1)![0].authorName).toBe("홍길동");
  });
});

describe("POST — 성공 응답", () => {
  it("201과 함께 작성한 댓글 DTO를 돌려준다 (canDelete=true)", async () => {
    getSessionUser.mockResolvedValue(user({ id: "user-1" }));
    createComment.mockResolvedValue(row({ id: "new", authorId: "user-1" }));

    const res = await POST(postReq({ body: "내용" }), ctx("cl-7"));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBe("new");
    expect(body.canDelete).toBe(true);
    expect(body.createdAt).toBe("2026-08-26T05:00:00.000Z");
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ clusterId: "cl-7", authorId: "user-1" })
    );
  });
});
