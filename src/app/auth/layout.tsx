import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@server/auth";
import { signOutAction } from "./actions";
import { SiteHeader } from "@/widgets/site-header";
import * as layout from "@/shared/styles/layout.css";

// 로그인/가입 화면은 색인할 이유가 없다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// 세션 확인에 쿠키를 읽으므로 어차피 동적이다. 명시하지 않으면 빌드가 정적 렌더를 시도하다
// 실패하면서 SDK가 "Cookie validation error"를 로그에 쏟아낸다.
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // 이미 로그인한 사용자가 로그인 화면에 머무를 이유가 없다.
  // (탈퇴처럼 '로그인 상태에서 쓰는' 화면은 이 레이아웃 밖 /account/* 에 둔다.)
  if (await getSessionUser()) redirect("/");

  return (
    <div className={layout.page}>
      <SiteHeader user={null} signOut={signOutAction} />

      <main className={layout.container}>{children}</main>
    </div>
  );
}
