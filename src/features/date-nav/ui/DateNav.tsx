import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/shared/ui";
import { formatBucketDateLabel } from "@/shared/lib/bucket-date";
import { datePath } from "../model";
import * as styles from "./DateNav.css";

interface DateNavProps {
  date: string;
  prevDate: string | null;
  nextDate: string | null;
  clusterCount: number;
  articleCount: number;
  /** 날짜를 옮겨도 언론사 필터를 유지한다. */
  outletIds?: string[];
}

function Arrow({
  to,
  outletIds,
  label,
  children,
}: {
  to: string | null;
  outletIds: string[];
  label: string;
  children: React.ReactNode;
}) {
  if (!to) {
    return (
      <span className={styles.arrowDisabled} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <Link href={datePath(to, outletIds)} className={styles.arrow} aria-label={label}>
      {children}
    </Link>
  );
}

export function DateNav({
  date,
  prevDate,
  nextDate,
  clusterCount,
  articleCount,
  outletIds = [],
}: DateNavProps) {
  return (
    <nav className={styles.root} aria-label="날짜 이동">
      <Arrow to={prevDate} outletIds={outletIds} label="이전 날짜">
        <ChevronLeftIcon size={18} />
      </Arrow>

      <div className={styles.center}>
        <p className={styles.label}>{formatBucketDateLabel(date)}</p>
        {clusterCount > 0 ? (
          <p className={styles.meta}>
            {clusterCount.toLocaleString()}개 이슈 · {articleCount.toLocaleString()}건
          </p>
        ) : (
          <p className={styles.empty}>수집된 기사가 없습니다</p>
        )}
      </div>

      <Arrow to={nextDate} outletIds={outletIds} label="다음 날짜">
        <ChevronRightIcon size={18} />
      </Arrow>
    </nav>
  );
}
