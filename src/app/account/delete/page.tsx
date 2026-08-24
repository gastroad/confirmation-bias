import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@server/auth";
import { deleteAccountAction } from "../../auth/actions";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata: Metadata = {
  title: "회원 탈퇴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DeleteAccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in");

  return <DeleteAccountForm email={user.email} action={deleteAccountAction} />;
}
