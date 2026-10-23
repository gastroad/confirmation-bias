import { describe, it, expect } from "vitest";
import { formatBucketDate } from "./bucket";
import { EMBEDDING_RETENTION_DAYS, embeddingCutoff } from "./retention";

describe("embeddingCutoff", () => {
  it("오늘(KST)을 포함해 보존 기간만큼의 날짜가 남는다", () => {
    // 2026-10-23 13:00 KST
    const now = new Date("2026-10-23T04:00:00Z");
    expect(formatBucketDate(embeddingCutoff(now, 14))).toBe("2026-10-10");
  });

  it("KST 날짜로 자른다 — UTC로는 전날이어도 KST 자정을 넘겼으면 하루 밀린다", () => {
    // 2026-10-24 00:30 KST = 2026-10-23 15:30 UTC
    expect(formatBucketDate(embeddingCutoff(new Date("2026-10-23T15:30:00Z"), 14))).toBe(
      "2026-10-11"
    );
  });

  it("cron이 클러스터링하는 '어제'는 지우지 않는다", () => {
    // cluster-daily cron 시각 = 2026-10-24 05:00 KST → 클러스터링 대상은 10-23
    const now = new Date("2026-10-23T20:00:00Z");
    // 비우는 것은 cutoff "미만"이므로 최소 보존 기간(2일)에서도 10-23은 남는다.
    expect(formatBucketDate(embeddingCutoff(now, 2))).toBe("2026-10-23");
  });

  it("어제를 지우게 되는 보존 기간은 거부한다", () => {
    expect(() => embeddingCutoff(new Date(), 1)).toThrow("2일 이상");
    expect(() => embeddingCutoff(new Date(), 0)).toThrow("2일 이상");
    expect(() => embeddingCutoff(new Date(), 2.5)).toThrow("정수");
  });

  it("기본 보존 기간은 14일이다 — 바꾸면 retention.ts 주석의 근거도 함께 고친다", () => {
    expect(EMBEDDING_RETENTION_DAYS).toBe(14);
  });
});
