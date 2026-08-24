import type { Comment } from "./model";

export async function fetchComments(clusterId: string): Promise<Comment[]> {
  const res = await fetch(`/api/clusters/${clusterId}/comments`);
  if (!res.ok) throw new Error(`댓글 조회 실패 (${res.status})`);
  return res.json();
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function postComment(clusterId: string, body: string): Promise<Comment> {
  const res = await fetch(`/api/clusters/${clusterId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "댓글을 등록하지 못했습니다."));
  return res.json();
}

export async function removeComment(id: string): Promise<void> {
  const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res, "댓글을 삭제하지 못했습니다."));
}
