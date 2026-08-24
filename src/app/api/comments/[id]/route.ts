import { getSessionUser } from "@server/auth";
import { deleteComment } from "@server/queries/comments";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  // 권한 판정은 쿼리의 where 절이 한다. 0건이면 없거나 남의 댓글인데,
  // 둘을 구분해 알려주면 존재 여부가 새어 나가므로 같은 응답을 준다.
  const count = await deleteComment(id, { id: user.id, isAdmin: user.role === "admin" });
  if (count === 0) return Response.json({ error: "삭제할 수 없습니다." }, { status: 404 });

  return new Response(null, { status: 204 });
}
