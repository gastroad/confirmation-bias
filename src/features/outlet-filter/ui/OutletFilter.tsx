"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  OUTLETS_BY_GROUP,
  LEANING_GROUP_ORDER,
  LEANING_GROUP_LABELS,
  LEANING_COLORS,
} from "@/entities/outlet";
import { OUTLETS_PARAM, parseOutletParam } from "../model";
import * as styles from "./OutletFilter.css";

export function OutletFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected = new Set(parseOutletParam(searchParams.get(OUTLETS_PARAM)));

  function commit(ids: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length === 0) {
      params.delete(OUTLETS_PARAM);
    } else {
      params.set(OUTLETS_PARAM, ids.join(","));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    commit([...next]);
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>
          지원 언론사
          {selected.size > 0 && ` · ${selected.size}개 선택`}
        </span>
        {selected.size > 0 && (
          <button type="button" className={styles.clearButton} onClick={() => commit([])}>
            전체 해제
          </button>
        )}
      </div>

      {LEANING_GROUP_ORDER.map((group) => (
        <div key={group} className={styles.group}>
          <span className={styles.groupLabel}>{LEANING_GROUP_LABELS[group]}</span>
          <div className={styles.chips}>
            {OUTLETS_BY_GROUP[group].map((outlet) => {
              const active = selected.has(outlet.id);
              return (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => toggle(outlet.id)}
                  aria-pressed={active}
                  className={active ? styles.chipActive : styles.chip}
                >
                  <span
                    className={styles.dot}
                    style={{ backgroundColor: LEANING_COLORS[outlet.leaning] }}
                  />
                  {outlet.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
