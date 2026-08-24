import { db } from "../db";

export const MAX_COMMENT_LENGTH = 1000;

export async function findComments(clusterId: string) {
  return db.comment.findMany({
    where: { clusterId },
    orderBy: { createdAt: "asc" },
    select: { id: true, authorId: true, authorName: true, body: true, createdAt: true },
  });
}

export async function countComments(clusterId: string): Promise<number> {
  return db.comment.count({ where: { clusterId } });
}

export async function createComment(input: {
  clusterId: string;
  authorId: string;
  authorName: string;
  body: string;
}) {
  return db.comment.create({
    data: input,
    select: { id: true, authorId: true, authorName: true, body: true, createdAt: true },
  });
}

/**
 * 본인 또는 관리자만 지운다. 권한 판정을 DB where 절에 넣어 호출부가 빠뜨릴 수 없게 한다.
 * @returns 삭제된 행 수 (0이면 없거나 권한 없음 — 호출부에서 구분하지 않는다)
 */
export async function deleteComment(id: string, actor: { id: string; isAdmin: boolean }) {
  const { count } = await db.comment.deleteMany({
    where: { id, ...(actor.isAdmin ? {} : { authorId: actor.id }) },
  });
  return count;
}

/**
 * 탈퇴 시 개인정보만 지우고 본문은 남긴다. 다른 사용자의 대화 맥락이 끊기지 않게.
 * 개인정보처리방침의 "탈퇴 시 파기"와 일관된다 — 식별자(authorId)와 표시명이 사라진다.
 */
export async function anonymizeCommentsByAuthor(authorId: string): Promise<number> {
  const { count } = await db.comment.updateMany({
    where: { authorId },
    data: { authorId: null, authorName: "탈퇴한 사용자" },
  });
  return count;
}

export interface RecentCommentRow {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: Date;
  clusterId: string;
  clusterTitle: string;
  clusterDate: Date;
}

/**
 * 관리자용 전체 댓글. 클러스터를 넘나들며 훑어야 신고·스팸에 대응할 수 있다.
 *
 * 커서는 `createdAt`이 아니라 `id`다 — 같은 초에 여러 건이 들어오면 시각만으로는
 * 경계가 흔들려 중복·누락이 난다.
 */
export async function findRecentComments(params: { cursor?: string; limit?: number }) {
  const take = Math.min(Math.max(params.limit ?? 30, 1), 100);
  const rows = await db.comment.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      authorId: true,
      authorName: true,
      body: true,
      createdAt: true,
      clusterId: true,
      cluster: { select: { representativeTitle: true, bucketDate: true } },
    },
  });

  return {
    rows: rows.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      authorName: r.authorName,
      body: r.body,
      createdAt: r.createdAt,
      clusterId: r.clusterId,
      clusterTitle: r.cluster.representativeTitle,
      clusterDate: r.cluster.bucketDate,
    })),
    nextCursor: rows.length === take ? rows[rows.length - 1].id : null,
  };
}

export async function countAllComments(): Promise<number> {
  return db.comment.count();
}
