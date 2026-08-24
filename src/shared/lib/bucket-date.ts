// 클러스터 목록의 날짜 축은 "YYYY-MM-DD" 문자열로 다룬다(KST 기준일).
// 파이프라인 쪽 Date 변환은 server/clustering/bucket.ts에 있지만, UI 레이어는 server/를
// import할 수 없으므로(FSD) 문자열을 다루는 최소한의 유틸만 여기 둔다.

const PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function isValidBucketDate(value: string): boolean {
  if (!PATTERN.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  // 2026-02-31 처럼 형식은 맞지만 없는 날짜를 거른다.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * "2026-08-23" → "2026년 8월 23일 (토)".
 *
 * 연도를 조건부로 감추지 않는 이유: 서버와 클라이언트가 "올해"를 다르게 볼 수 있어
 * hydration 불일치가 난다. UTC 기준으로 계산해 어느 시간대에서 렌더해도 같은 문자열이 나온다.
 */
export function formatBucketDateLabel(value: string): string {
  const d = new Date(`${value}T00:00:00Z`);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

/** "2026-08-23" → "8월 23일". 카드처럼 폭이 좁은 곳에서 쓴다. */
export function formatBucketDateShort(value: string): string {
  const d = new Date(`${value}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export function shiftBucketDate(value: string, days: number): string {
  const d = new Date(`${value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
