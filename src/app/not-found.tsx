import Link from "next/link";
import type { Metadata } from "next";
import * as styles from "./status.css";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className={styles.root}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>페이지를 찾을 수 없습니다</h1>
      <p className={styles.message}>
        주소가 바뀌었거나 삭제된 페이지입니다. 클러스터는 매일 다시 묶이므로 예전에 저장해 둔 이슈
        주소는 더 이상 유효하지 않을 수 있습니다.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.secondary}>
          최신 뉴스 보기
        </Link>
      </div>
    </div>
  );
}
