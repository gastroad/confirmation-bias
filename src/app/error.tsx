"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as styles from "./status.css";

/**
 * 렌더 중 예외를 잡는 경계. 서버 컴포넌트가 DB를 직접 조회하므로 **Neon 장애나
 * autosuspend wake 지연이 그대로 예외가 된다.** 그때 흰 화면 대신 재시도를 제공한다.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 예외는 digest만 클라이언트로 온다(내용은 서버 로그에). 콘솔에 남겨 추적을 돕는다.
    console.error("[error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>일시적인 문제가 발생했습니다</h1>
      <p className={styles.message}>
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. 계속 같은 화면이 보이면 잠시 뒤에
        접속해 주세요.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={reset}>
          다시 시도
        </button>
        <Link href="/" className={styles.secondary}>
          홈으로
        </Link>
      </div>
      {error.digest && <p className={styles.digest}>오류 코드: {error.digest}</p>}
    </div>
  );
}
