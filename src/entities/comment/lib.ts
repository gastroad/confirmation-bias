import type { Comment } from "./model";

interface CommentRow {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: Date;
}

interface Viewer {
  id: string;
  isAdmin: boolean;
}

/**
 * 삭제 권한은 **서버에서 계산해 내려준다.** 클라이언트가 판단하면 UI만 숨겨질 뿐
 * 실제 권한과 어긋날 수 있다(실제 삭제는 server/queries/comments.ts가 다시 검사한다).
 */
export function toComment(row: CommentRow, viewer: Viewer | null): Comment {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    canDelete: Boolean(viewer && (viewer.isAdmin || (row.authorId && row.authorId === viewer.id))),
  };
}
