"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { AuthFormState } from "@/features/auth-form";
import * as styles from "./delete-account.css";

const CONFIRM_WORD = "탈퇴";

interface Props {
  email: string;
  action: (state: AuthFormState | null, formData: FormData) => Promise<AuthFormState>;
}

export function DeleteAccountForm({ email, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthFormState | null, FormData>(action, null);
  // 되돌릴 수 없는 동작이라 한 단계 마찰을 둔다. 버튼 하나로 계정이 사라지지 않게.
  const [confirm, setConfirm] = useState("");

  return (
    <form action={formAction} className={styles.root}>
      <h1 className={styles.heading}>회원 탈퇴</h1>

      {state?.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.warning}>
        <strong>이 작업은 되돌릴 수 없습니다.</strong>
        <ul className={styles.list}>
          <li>계정 정보(이메일·이름·비밀번호)가 삭제됩니다.</li>
          <li>작성한 댓글은 남지만 작성자가 &ldquo;탈퇴한 사용자&rdquo;로 바뀝니다.</li>
          <li>같은 이메일로 다시 가입할 수 있으나, 이전 댓글과 다시 연결되지는 않습니다.</li>
        </ul>
      </div>

      <p className={styles.account}>
        탈퇴할 계정: <span className={styles.email}>{email}</span>
      </p>

      <label className={styles.confirmLabel} htmlFor="confirm">
        계속하려면 <strong>{CONFIRM_WORD}</strong>를 입력하세요.
      </label>
      <input
        id="confirm"
        className={styles.input}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="off"
      />

      <div className={styles.actions}>
        <Link href="/" className={styles.cancel}>
          취소
        </Link>
        <button
          type="submit"
          className={styles.danger}
          disabled={confirm.trim() !== CONFIRM_WORD || pending}
        >
          {pending ? "처리 중…" : "탈퇴하기"}
        </button>
      </div>
    </form>
  );
}
