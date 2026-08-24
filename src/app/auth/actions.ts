"use server";

import { redirect } from "next/navigation";
import { auth } from "@server/auth";
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

  const { error } = await auth.signIn.email({ email, password });
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

  const { error } = await auth.signUp.email({ email, password, name: name || email });
  if (error) return { error: toMessage(error.message) };

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await auth.signOut();
  redirect("/");
}
