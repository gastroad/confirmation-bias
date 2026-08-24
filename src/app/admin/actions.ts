"use server";

import { getSessionUser, isAdmin } from "@server/auth";
import { dispatchWorkflow, type WorkflowFile } from "@server/github";

export interface TriggerState {
  ok: boolean;
  message: string;
}

// proxy가 /admin 을 로그인 뒤로 보내지만, Server Action은 URL과 무관하게 호출될 수 있다.
// 권한 확인을 액션 안에서 다시 한다.
async function assertAdmin(): Promise<void> {
  if (!isAdmin(await getSessionUser())) throw new Error("권한이 없습니다.");
}

async function trigger(workflow: WorkflowFile, inputs?: Record<string, string>) {
  await assertAdmin();
  return dispatchWorkflow(workflow, inputs);
}

export async function triggerCollectAction(
  _prev: TriggerState | null,
  _formData: FormData
): Promise<TriggerState> {
  return trigger("collect.yml");
}

export async function triggerClusterAction(
  _prev: TriggerState | null,
  formData: FormData
): Promise<TriggerState> {
  const date = String(formData.get("date") ?? "").trim();
  return trigger("cluster-daily.yml", date ? { date } : {});
}
