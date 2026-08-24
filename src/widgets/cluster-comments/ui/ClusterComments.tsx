"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchComments,
  postComment,
  removeComment,
  MAX_COMMENT_LENGTH,
  type Comment,
} from "@/entities/comment";
import { formatDate } from "@/shared/lib/format";
import * as styles from "./ClusterComments.css";

interface ClusterCommentsProps {
  clusterId: string;
  /** 서버 컴포넌트가 세션을 읽어 내려준다. 비로그인이면 false */
  signedIn: boolean;
}

function CommentItem({
  comment,
  onDelete,
  deleting,
}: {
  comment: Comment;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <span className={comment.authorId ? styles.author : styles.authorGone}>
          {comment.authorName}
        </span>
        <span className={styles.time}>{formatDate(comment.createdAt)}</span>
        {comment.canDelete && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => onDelete(comment.id)}
            disabled={deleting}
          >
            삭제
          </button>
        )}
      </div>
      <p className={styles.body}>{comment.body}</p>
    </li>
  );
}

export function ClusterComments({ clusterId, signedIn }: ClusterCommentsProps) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", clusterId];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchComments(clusterId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: (body: string) => postComment(clusterId, body),
    onSuccess: () => {
      setDraft("");
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => removeComment(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const trimmed = draft.trim();
  const over = draft.length > MAX_COMMENT_LENGTH;
  const canSubmit = trimmed.length > 0 && !over && !create.isPending;

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>
        댓글
        {comments.length > 0 && <span className={styles.count}>{comments.length}</span>}
      </h2>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {signedIn ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) create.mutate(trimmed);
          }}
        >
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="이 이슈에 대한 생각을 남겨보세요."
            aria-label="댓글 내용"
          />
          <div className={styles.formFooter}>
            <span className={over ? styles.counterOver : styles.counter}>
              {draft.length} / {MAX_COMMENT_LENGTH}
            </span>
            <button type="submit" className={styles.submit} disabled={!canSubmit}>
              {create.isPending ? "등록 중…" : "등록"}
            </button>
          </div>
        </form>
      ) : (
        <p className={styles.signInPrompt}>
          <Link href="/auth/sign-in" className={styles.link}>
            로그인
          </Link>
          하면 댓글을 남길 수 있습니다.
        </p>
      )}

      {isLoading ? (
        <p className={styles.empty}>불러오는 중…</p>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>아직 댓글이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onDelete={(id) => destroy.mutate(id)}
              deleting={destroy.isPending}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
