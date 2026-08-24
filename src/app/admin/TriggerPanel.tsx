"use client";

import { useActionState } from "react";
import type { TriggerState } from "./actions";
import * as styles from "./admin.css";

type FormAction = (state: TriggerState | null, formData: FormData) => Promise<TriggerState>;

function Result({ state }: { state: TriggerState | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? styles.ok : styles.fail} role="status">
      {state.ok ? "✅" : "⚠️"} {state.message}
    </p>
  );
}

export function CollectPanel({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState<TriggerState | null, FormData>(action, null);
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>지금 수집</h2>
      <p className={styles.desc}>
        RSS를 즉시 긁어 새 기사를 적재합니다. 자동으로는 3시간마다 돕니다. 임베딩·클러스터링은 하지
        않습니다.
      </p>
      <form action={formAction} className={styles.row}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "요청 중…" : "수집 실행"}
        </button>
        <Result state={state} />
      </form>
    </section>
  );
}

export function ClusterPanel({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState<TriggerState | null, FormData>(action, null);
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>클러스터링 재실행</h2>
      <p className={styles.desc}>
        날짜를 비우면 어제(KST)를 처리합니다. 멱등하므로 같은 날짜를 다시 돌려도 안전합니다.
      </p>
      <form action={formAction} className={styles.row}>
        <input
          name="date"
          className={styles.input}
          placeholder="YYYY-MM-DD (비우면 어제)"
          pattern="\d{4}-\d{2}-\d{2}"
          size={22}
        />
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "요청 중…" : "클러스터링 실행"}
        </button>
        <Result state={state} />
      </form>
    </section>
  );
}
