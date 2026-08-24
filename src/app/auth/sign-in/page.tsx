import type { Metadata } from "next";
import { AuthForm } from "@/features/auth-form";
import { signInAction } from "../actions";

export const metadata: Metadata = { title: "로그인" };

export default function SignInPage() {
  return <AuthForm mode="sign-in" action={signInAction} />;
}
