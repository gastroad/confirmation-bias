import { isValidBucketDate } from "@/shared/lib/bucket-date";

export const DATE_PARAM = "date";

/**
 * `?date=2026-08-23` 값을 KST 기준일 Date로 파싱한다.
 * 서버(API 라우트)와 클라이언트가 같은 규칙을 쓰기 위한 순수 함수.
 * 형식이 어긋나거나 존재하지 않는 날짜면 undefined(= 날짜 필터 없음).
 *
 * `@db.Date` 컬럼과 맞추기 위해 UTC 자정 Date를 만든다.
 */
export function parseDateParam(value: string | undefined | null): Date | undefined {
  if (!value || !isValidBucketDate(value)) return undefined;
  return new Date(`${value}T00:00:00Z`);
}

/** 날짜별 페이지 경로. 목록의 날짜 축은 쿼리가 아니라 path로 둔다(canonical이 명확해진다). */
export function datePath(date: string, outletIds: string[] = []): string {
  const qs = outletIds.length > 0 ? `?outlets=${outletIds.join(",")}` : "";
  return `/d/${date}${qs}`;
}
