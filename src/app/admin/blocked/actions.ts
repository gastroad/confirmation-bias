"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, isAdmin } from "@server/auth";
import { blockUrl, unblockUrl } from "@server/queries/blocked-urls";

export interface BlockActionState {
  error: string | null;
  message: string | null;
}

// proxy가 /admin을 막지만 Server Action은 URL과 무관하게 호출될 수 있어 여기서 다시 본다.
async function requireAdmin() {
  const user = await getSessionUser();
  if (!isAdmin(user)) return null;
  return user!;
}

export async function blockUrlAction(
  _prev: BlockActionState | null,
  formData: FormData
): Promise<BlockActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "권한이 없습니다.", message: null };

  const url = String(formData.get("url") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!url) return { error: "URL을 입력해주세요.", message: null };
  try {
    // 오타로 엉뚱한 값을 넣으면 조용히 아무것도 안 막게 되므로 형식을 확인한다.
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("scheme");
  } catch {
    return { error: "http(s)로 시작하는 기사 주소를 입력해주세요.", message: null };
  }

  const result = await blockUrl({ url, reason, blockedBy: user.id });
  revalidatePath("/admin/blocked");

  return {
    error: null,
    message:
      result.removedArticles > 0
        ? "차단했고 이미 수집된 기사도 삭제했습니다."
        : "차단했습니다. (아직 수집되지 않은 기사이며 앞으로도 수집되지 않습니다)",
  };
}

export async function unblockUrlAction(
  _prev: BlockActionState | null,
  formData: FormData
): Promise<BlockActionState> {
  if (!(await requireAdmin())) return { error: "권한이 없습니다.", message: null };

  const url = String(formData.get("url") ?? "");
  const count = await unblockUrl(url);
  revalidatePath("/admin/blocked");

  // 해제해도 이미 지운 기사가 되살아나지는 않는다. 다음 수집에 다시 들어온다.
  return count > 0
    ? { error: null, message: "차단을 해제했습니다. 다음 수집부터 다시 들어옵니다." }
    : { error: "이미 해제된 URL입니다.", message: null };
}
