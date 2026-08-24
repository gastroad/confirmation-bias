"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthFormState, AuthFormAction } from "../model";
import * as styles from "./AuthForm.css";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  action: AuthFormAction;
}

const COPY = {
  "sign-in": {
    heading: "로그인",
    submit: "로그인",
    pending: "로그인 중…",
    footer: "계정이 없으신가요?",
    linkHref: "/auth/sign-up",
    linkLabel: "가입하기",
  },
  "sign-up": {
    heading: "회원가입",
    submit: "가입하기",
    pending: "가입 중…",
    footer: "이미 계정이 있으신가요?",
    linkHref: "/auth/sign-in",
    linkLabel: "로그인",
  },
} as const;

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState | null, FormData>(action, null);
  const copy = COPY[mode];

  return (
    <div className={styles.root}>
      <h1 className={styles.heading}>{copy.heading}</h1>

      <form action={formAction} className={styles.form}>
        {state?.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}

        {mode === "sign-up" && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              이름 (선택)
            </label>
            <input id="name" name="name" className={styles.input} autoComplete="name" />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={styles.input}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "sign-up" ? 8 : undefined}
            className={styles.input}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          />
        </div>

        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? copy.pending : copy.submit}
        </button>
      </form>

      <p className={styles.footer}>
        {copy.footer}{" "}
        <Link href={copy.linkHref} className={styles.link}>
          {copy.linkLabel}
        </Link>
      </p>
    </div>
  );
}
