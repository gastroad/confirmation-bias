export const MAX_COMMENT_LENGTH = 1000;

export interface Comment {
  id: string;
  /** 탈퇴한 사용자면 null */
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  /** 지금 보고 있는 사용자가 이 댓글을 지울 수 있는지 (서버가 판단해 내려준다) */
  canDelete: boolean;
}
