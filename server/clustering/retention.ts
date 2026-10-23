import { toBucketDate } from "./bucket";

/**
 * 임베딩 보존 기간(KST 날짜 수). 이보다 오래된 날짜의 `Article.embedding`은 비운다.
 *
 * 임베딩은 storage의 절반을 차지하지만 다시 읽히지 않는다(2026-10-23 실측, pg_database_size 기준).
 * - DB 268MB 중 `Article` 240MB = heap 51MB · 인덱스 27MB · **TOAST 162MB**. TOAST가 곧 임베딩이다.
 *   2,048B가 TOAST 임계를 넘어 전량 외부 저장되고, 난수성 float라 압축되지 않는다. 2,000B 청크
 *   둘로 쪼개져(둘째는 48B) 행당 실점유가 약 2.7KB다.
 * - 임베딩을 읽는 곳은 `clusterDay`(그날 기사)와 `backfill:titles`뿐이다. 지난 날짜를 다시
 *   클러스터링하면 클러스터 id가 바뀌어 색인 URL이 404가 되므로 이미 하지 않는다.
 * - 행당 약 4.0KB → 임베딩을 빼면 약 1.3KB. 월 14,000~19,000건 유입이라 증가율이 약 72MB/월 →
 *   약 23MB/월로 1/3이 되고, 보존 기간치(약 23MB)는 롤링 버퍼로 상시 남는다.
 *
 * 14일인 이유: cron 간격이 최대 14.9시간까지 벌어진 적이 있고(늦게 도착한 기사로 그 주 날짜를
 * 다시 돌릴 여지), 계획된 cross-outlet 중복 감지도 최근 며칠치면 성립한다.
 * 잃는 것은 지난 날짜로 임계값을 재튜닝하는 경로인데, `cluster:day --dry-run --embed-missing`이
 * 메모리에서 다시 임베딩한다(5만 건에 약 $0.16) — 되돌릴 수 없는 손실이 아니다.
 */
export const EMBEDDING_RETENTION_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 이 날짜(KST 버킷) **미만**인 기사의 임베딩을 비운다. 오늘을 포함해 `days`일치가 남는다. */
export function embeddingCutoff(now: Date, days: number = EMBEDDING_RETENTION_DAYS): Date {
  if (!Number.isInteger(days) || days < 2) {
    // cron이 클러스터링하는 날짜가 "어제"다. 1 이하면 클러스터링 전에 임베딩을 지운다.
    throw new Error(`보존 기간은 2일 이상의 정수여야 합니다: ${days}`);
  }
  return new Date(toBucketDate(now).getTime() - (days - 1) * DAY_MS);
}
