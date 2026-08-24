import { describe, it, expect } from "vitest";
import { toBucketDate, parseBucketDate, formatBucketDate, bucketRange, eachBucket } from "./bucket";

describe("toBucketDate", () => {
  it("KST 자정 직후는 그날로 들어간다", () => {
    // 2026-08-23 00:10 KST = 2026-08-22 15:10 UTC
    expect(formatBucketDate(toBucketDate(new Date("2026-08-22T15:10:00Z")))).toBe("2026-08-23");
  });

  it("KST 자정 직전은 전날로 남는다", () => {
    // 2026-08-22 23:50 KST = 2026-08-22 14:50 UTC
    expect(formatBucketDate(toBucketDate(new Date("2026-08-22T14:50:00Z")))).toBe("2026-08-22");
  });

  it("UTC 자정은 이미 KST로 같은 날 09시라 같은 날짜다", () => {
    expect(formatBucketDate(toBucketDate(new Date("2026-08-23T00:00:00Z")))).toBe("2026-08-23");
  });
});

describe("parseBucketDate", () => {
  it("왕복 변환이 보존된다", () => {
    expect(formatBucketDate(parseBucketDate("2026-08-23"))).toBe("2026-08-23");
  });

  it("형식이 어긋나면 던진다", () => {
    expect(() => parseBucketDate("2026/08/23")).toThrow("YYYY-MM-DD");
    expect(() => parseBucketDate("20260823")).toThrow("YYYY-MM-DD");
  });
});

describe("bucketRange", () => {
  it("KST 하루를 덮는 UTC 구간을 낸다", () => {
    const { start, end } = bucketRange(parseBucketDate("2026-08-23"));
    expect(start.toISOString()).toBe("2026-08-22T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-23T15:00:00.000Z");
  });

  it("구간 경계가 toBucketDate와 일치한다", () => {
    const bucket = parseBucketDate("2026-08-23");
    const { start, end } = bucketRange(bucket);
    expect(formatBucketDate(toBucketDate(start))).toBe("2026-08-23");
    expect(formatBucketDate(toBucketDate(new Date(end.getTime() - 1)))).toBe("2026-08-23");
    expect(formatBucketDate(toBucketDate(end))).toBe("2026-08-24");
  });
});

describe("eachBucket", () => {
  it("양끝을 포함한 날짜 목록을 낸다", () => {
    const days = eachBucket(parseBucketDate("2026-08-21"), parseBucketDate("2026-08-23"));
    expect(days.map(formatBucketDate)).toEqual(["2026-08-21", "2026-08-22", "2026-08-23"]);
  });
});
