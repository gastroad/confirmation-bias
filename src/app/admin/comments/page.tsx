import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, isAdmin } from "@server/auth";
import { findRecentComments, countAllComments } from "@server/queries/comments";
import { ProfileMenu } from "@/features/profile-menu";
import { Logo } from "@/shared/ui";
import { signOutAction } from "../../auth/actions";
import { adminDeleteCommentAction } from "./actions";
import { CommentRow } from "./CommentRow";
import * as styles from "./comments.css";
import * as layout from "@/shared/styles/layout.css";

export const metadata: Metadata = {
  title: "댓글 관리",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 30;

type Search = Promise<{ cursor?: string }>;

export default async function AdminCommentsPage({ searchParams }: { searchParams: Search }) {
  const sessionUser = await getSessionUser();
  const denied = !isAdmin(sessionUser);

  const { cursor } = await searchParams;
  // 권한이 없으면 조회 자체를 하지 않는다.
  const [data, total] = denied
    ? [{ rows: [], nextCursor: null }, 0]
    : await Promise.all([findRecentComments({ cursor, limit: PAGE_SIZE }), countAllComments()]);

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/admin" className={layout.backLink}>
            ← 관리
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
          <h1 className={layout.brandSmall}>댓글 관리</h1>
          <div className={layout.headerActions}>
            <ProfileMenu user={sessionUser} signOut={signOutAction} />
          </div>
        </div>
      </header>

      <main className={layout.container}>
        {denied ? (
          <p className={styles.error}>
            관리자 권한이 필요합니다. 계정에 <code>admin</code> 역할이 부여되어야 합니다.
          </p>
        ) : (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>전체 댓글</h2>
              <span className={styles.count}>{total.toLocaleString()}건</span>
            </div>

            {data.rows.length === 0 ? (
              <p className={styles.empty}>댓글이 없습니다.</p>
            ) : (
              <>
                <ul className={styles.list}>
                  {data.rows.map((r) => (
                    <CommentRow
                      key={r.id}
                      action={adminDeleteCommentAction}
                      comment={{
                        id: r.id,
                        authorId: r.authorId,
                        authorName: r.authorName,
                        body: r.body,
                        createdAt: r.createdAt.toISOString(),
                        clusterId: r.clusterId,
                        clusterTitle: r.clusterTitle,
                        clusterDate: r.clusterDate.toISOString().slice(0, 10),
                      }}
                    />
                  ))}
                </ul>

                {/* 관리 화면이라 무한 스크롤 대신 명시적인 더보기를 쓴다(삭제 중 위치가 흔들리지 않게). */}
                {data.nextCursor && (
                  <Link href={`/admin/comments?cursor=${data.nextCursor}`} className={styles.more}>
                    더 보기
                  </Link>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
