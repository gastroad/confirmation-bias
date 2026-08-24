const REPO = "gastroad/confirmation-bias";

export type WorkflowFile = "collect.yml" | "cluster-daily.yml";

export interface DispatchResult {
  ok: boolean;
  message: string;
}

/**
 * GitHub Actions 워크플로우를 수동 실행한다.
 *
 * 무거운 배치(OpenAI 다수 호출)를 Vercel 함수 안에서 돌리면 타임아웃에 걸리므로,
 * 웹은 트리거만 하고 실행은 Actions에서 한다.
 * **호출부에서 반드시 관리자 권한을 확인할 것** — 공개되면 OpenAI 비용 어뷰징 경로가 된다.
 */
export async function dispatchWorkflow(
  workflow: WorkflowFile,
  inputs: Record<string, string> = {}
): Promise<DispatchResult> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) return { ok: false, message: "GITHUB_DISPATCH_TOKEN이 설정되지 않았습니다." };

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
      signal: AbortSignal.timeout(10_000),
    }
  );

  // 성공은 204 No Content다.
  if (res.status === 204) return { ok: true, message: "실행을 요청했습니다." };

  const detail = await res.text();
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: "토큰 권한이 부족합니다 (Actions: Read and write 필요)." };
  }
  return { ok: false, message: `GitHub ${res.status}: ${detail.slice(0, 120)}` };
}
