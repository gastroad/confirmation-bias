import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "../_session";
import { AppShell } from "../_shell";

// 로그인/가입 화면은 색인할 이유가 없다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// 셸이 세션 쿠키를 읽어 어차피 동적이다 → app/_shell.tsx. 명시하지 않으면 빌드가 정적 렌더를
// 시도하다 실패하면서 SDK가 "Cookie validation error"를 로그에 쏟아낸다.
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // 이미 로그인한 사용자가 로그인 화면에 머무를 이유가 없다.
  // (탈퇴처럼 '로그인 상태에서 쓰는' 화면은 이 레이아웃 밖 /account/* 에 둔다.)
  if (await getUser()) redirect("/");

  return <AppShell>{children}</AppShell>;
}
