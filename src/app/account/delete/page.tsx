import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "../../_session";
import { AppShell } from "../../_shell";
import { deleteAccountAction } from "../../auth/actions";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata: Metadata = {
  title: "회원 탈퇴",
  robots: { index: false, follow: false },
};

// 셸이 세션 쿠키를 읽어 어차피 동적이다 → app/_shell.tsx
export const dynamic = "force-dynamic";

export default async function DeleteAccountPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <AppShell>
      <DeleteAccountForm email={user.email} action={deleteAccountAction} />
    </AppShell>
  );
}
