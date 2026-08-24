"use client";

import { useActionState } from "react";
import type { BlockActionState } from "./actions";
import * as styles from "./blocked.css";

type Action = (state: BlockActionState | null, formData: FormData) => Promise<BlockActionState>;

export function BlockForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<BlockActionState | null, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className={styles.form}>
      <h2 className={styles.title}>기사 차단</h2>
      <p className={styles.hint}>
        저작권자의 표시 중단 요청에 씁니다. 등록하면 <strong>이미 수집된 기사가 삭제되고</strong>,
        이후 수집에서도 이 주소는 들어오지 않습니다. 아직 수집되지 않은 주소도 미리 넣을 수
        있습니다.
      </p>

      {state?.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className={styles.ok} role="status">
          {state.message}
        </p>
      )}

      <input
        name="url"
        className={styles.input}
        placeholder="https://example.com/news/123"
        aria-label="차단할 기사 주소"
      />
      <input
        name="reason"
        className={styles.input}
        placeholder="사유 메모 (선택) — 예: OO일보 2026-08-24 요청"
        aria-label="차단 사유"
      />
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "처리 중…" : "차단"}
      </button>
    </form>
  );
}

export function UnblockButton({ url, action }: { url: string; action: Action }) {
  const [, formAction, pending] = useActionState<BlockActionState | null, FormData>(action, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="url" value={url} />
      <button type="submit" className={styles.deleteButton} disabled={pending}>
        {pending ? "해제 중…" : "차단 해제"}
      </button>
    </form>
  );
}
