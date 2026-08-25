import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/shared/ui";
import { formatBucketDateNumeric, bucketDateWeekday } from "@/shared/lib/bucket-date";
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
      <div className={styles.center}>
        <div className={styles.dateLine}>
          <h2 className={styles.date}>{formatBucketDateNumeric(date)}</h2>
          <span className={styles.weekday}>{bucketDateWeekday(date)}</span>
        </div>
        {clusterCount > 0 ? (
          <p className={styles.meta}>
            {clusterCount.toLocaleString()}개 이슈 · {articleCount.toLocaleString()}건
          </p>
        ) : (
          <p className={styles.empty}>수집된 기사가 없습니다</p>
        )}
      </div>

      <div className={styles.arrows}>
        <Arrow to={prevDate} outletIds={outletIds} label="이전 날짜">
          <ChevronLeftIcon size={18} />
        </Arrow>
        <Arrow to={nextDate} outletIds={outletIds} label="다음 날짜">
          <ChevronRightIcon size={18} />
        </Arrow>
      </div>
    </nav>
  );
}
