import { getSessionUser } from "@server/auth";
import { findComments, createComment, MAX_COMMENT_LENGTH } from "@server/queries/comments";
import { toComment } from "@/entities/comment";

type Ctx = { params: Promise<{ id: string }> };

function viewerOf(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return user ? { id: user.id, isAdmin: user.role === "admin" } : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  const rows = await findComments(id);
  return Response.json(rows.map((r) => toComment(r, viewerOf(user))));
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { body } = (await req.json().catch(() => ({}))) as { body?: unknown };
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return Response.json({ error: "내용을 입력해주세요." }, { status: 400 });
  if (text.length > MAX_COMMENT_LENGTH) {
    return Response.json({ error: `${MAX_COMMENT_LENGTH}자를 넘을 수 없습니다.` }, { status: 400 });
  }

  // 표시명은 작성 시점 값을 굳힌다(neon_auth와 join할 수 없다).
  // 이름이 없으면 이메일 로컬파트만 쓴다 — 도메인까지 노출할 이유가 없다.
  const authorName = user.name?.trim() || user.email.split("@")[0];

  const created = await createComment({
    clusterId: id,
    authorId: user.id,
    authorName,
    body: text,
  });
  return Response.json(toComment(created, viewerOf(user)), { status: 201 });
}
