"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, isAdmin } from "@server/auth";
import { deleteComment } from "@server/queries/comments";

export interface DeleteState {
  error: string | null;
}

/**
 * 관리자 화면에서의 삭제.
 *
 * proxy가 `/admin`을 막지만 Server Action은 URL과 무관하게 호출될 수 있으므로 여기서 다시 본다.
 * 실제 권한 판정은 `deleteComment`의 where 절이 또 한 번 한다(3중).
 */
export async function adminDeleteCommentAction(
  _prev: DeleteState | null,
  formData: FormData
): Promise<DeleteState> {
  const user = await getSessionUser();
  if (!isAdmin(user)) return { error: "권한이 없습니다." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "댓글을 찾을 수 없습니다." };

  const count = await deleteComment(id, { id: user!.id, isAdmin: true });
  if (count === 0) return { error: "이미 삭제된 댓글입니다." };

  revalidatePath("/admin/comments");
  return { error: null };
}
