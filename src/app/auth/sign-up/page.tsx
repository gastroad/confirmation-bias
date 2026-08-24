import type { Metadata } from "next";
import { AuthForm } from "@/features/auth-form";
import { signUpAction } from "../actions";

export const metadata: Metadata = { title: "회원가입" };

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUpAction} />;
}
