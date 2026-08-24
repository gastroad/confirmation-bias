"use server";

import { redirect } from "next/navigation";
import { AUTH_CONFIGURED, getAuth, getSessionUser } from "@server/auth";
import { anonymizeCommentsByAuthor } from "@server/queries/comments";
import type { AuthFormState } from "@/features/auth-form";

// SDK 에러 메시지는 영문이라 사용자에게 그대로 보이면 곤란하다. 흔한 경우만 우리말로 바꾸고
// 나머지는 일반 문구로 덮는다(내부 사정을 노출하지 않는다).
function toMessage(raw: string | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("invalid") || m.includes("password"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("exists") || m.includes("already")) return "이미 가입된 이메일입니다.";
  if (m.includes("email")) return "이메일 형식을 확인해주세요.";
  return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

export async function signInAction(
  _prev: AuthFormState | null,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해주세요." };

  if (!AUTH_CONFIGURED) return { error: "인증이 설정되지 않았습니다." };

  const { error } = await getAuth().signIn.email({ email, password });
  if (error) return { error: toMessage(error.message) };

  redirect("/");
}

export async function signUpAction(
  _prev: AuthFormState | null,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) return { error: "이메일과 비밀번호를 입력해주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };

  if (!AUTH_CONFIGURED) return { error: "인증이 설정되지 않았습니다." };

  const { error } = await getAuth().signUp.email({ email, password, name: name || email });
  if (error) return { error: toMessage(error.message) };

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  if (AUTH_CONFIGURED) await getAuth().signOut();
  redirect("/");
}

/**
 * 회원 탈퇴.
 *
 * **댓글은 지우지 않고 익명화한다** — 본문을 지우면 다른 사람의 대화 맥락이 끊긴다.
 * 개인정보처리방침의 "탈퇴 시 파기"와도 일관된다(식별자와 표시명이 사라진다).
 *
 * 순서가 중요하다: 계정을 먼저 지우면 세션이 사라져 어떤 댓글을 익명화할지 알 수 없다.
 */
export async function deleteAccountAction(): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return { error: "인증이 설정되지 않았습니다." };

  const user = await getSessionUser();
  if (!user) redirect("/");

  await anonymizeCommentsByAuthor(user.id);

  const { error } = await getAuth().deleteUser();
  if (error) return { error: toMessage(error.message) };

  redirect("/");
}
