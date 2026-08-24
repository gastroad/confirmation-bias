"use client";

import { useActionState } from "react";
import Link from "next/link";
import { formatDate } from "@/shared/lib/format";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
import type { DeleteState } from "./actions";
import * as styles from "./comments.css";

export interface AdminComment {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  clusterId: string;
  clusterTitle: string;
  clusterDate: string;
}

interface Props {
  comment: AdminComment;
  action: (state: DeleteState | null, formData: FormData) => Promise<DeleteState>;
}

export function CommentRow({ comment, action }: Props) {
  const [state, formAction, pending] = useActionState<DeleteState | null, FormData>(action, null);

  return (
    <li className={styles.item}>
      {state?.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.meta}>
        <span className={comment.authorId ? styles.author : styles.authorGone}>
          {comment.authorName}
        </span>
        <span className={styles.time}>{formatDate(comment.createdAt)}</span>
        <form action={formAction}>
          <input type="hidden" name="id" value={comment.id} />
          <button type="submit" className={styles.deleteButton} disabled={pending}>
            {pending ? "삭제 중…" : "삭제"}
          </button>
        </form>
      </div>

      <p className={styles.body}>{comment.body}</p>

      <p className={styles.source}>
        {formatBucketDateShort(comment.clusterDate)} ·{" "}
        <Link href={`/clusters/${comment.clusterId}`} className={styles.sourceLink}>
          {comment.clusterTitle}
        </Link>
      </p>
    </li>
  );
}
