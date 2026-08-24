import Link from "next/link";
import * as styles from "./AuthMenu.css";

interface AuthMenuProps {
  /** 비로그인이면 null */
  user: { email: string; role: "user" | "admin" } | null;
  /** 로그아웃 Server Action. app 레이어가 주입한다. */
  signOut: () => Promise<void>;
}

export function AuthMenu({ user, signOut }: AuthMenuProps) {
  if (!user) {
    return (
      <Link href="/auth/sign-in" className={styles.link}>
        로그인
      </Link>
    );
  }

  return (
    <div className={styles.root}>
      {user.role === "admin" && (
        <Link href="/admin" className={styles.adminLink}>
          관리
        </Link>
      )}
      <span className={styles.email}>{user.email}</span>
      <form action={signOut}>
        <button type="submit" className={styles.signOutButton}>
          로그아웃
        </button>
      </form>
    </div>
  );
}
