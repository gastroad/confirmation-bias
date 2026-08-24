// 클러스터링 단위는 "KST 기준 하루"다. 한국은 DST가 없어 고정 +9로 다뤄도 안전하다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 시각을 KST 기준 날짜로 환산한다. 반환값은 그 날짜의 UTC 자정이며,
 * Prisma `@db.Date` 컬럼에 그대로 저장된다(시간대 없는 날짜라 UTC 날짜 부분만 쓰인다).
 */
export function toBucketDate(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

/** "2026-08-23" → 해당 KST 날짜 버킷 */
export function parseBucketDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new Error(`날짜 형식이 YYYY-MM-DD가 아님: ${s}`);
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) throw new Error(`유효하지 않은 날짜: ${s}`);
  return date;
}

export function formatBucketDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 버킷의 KST 하루가 덮는 UTC 구간 [start, end). publishedAt 범위 조회에 쓴다. */
export function bucketRange(bucket: Date): { start: Date; end: Date } {
  const start = new Date(bucket.getTime() - KST_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function eachBucket(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += 24 * 60 * 60 * 1000) {
    out.push(new Date(t));
  }
  return out;
}
