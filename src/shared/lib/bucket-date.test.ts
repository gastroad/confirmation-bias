import { describe, it, expect } from "vitest";
import {
  isValidBucketDate,
  formatBucketDateLabel,
  formatBucketDateShort,
  shiftBucketDate,
} from "./bucket-date";

describe("isValidBucketDate", () => {
  it("YYYY-MM-DD를 통과시킨다", () => {
    expect(isValidBucketDate("2026-08-23")).toBe(true);
  });

  it("형식이 어긋나면 거른다", () => {
    for (const v of ["2026/08/23", "20260823", "2026-8-3", "", "abc"]) {
      expect(isValidBucketDate(v)).toBe(false);
    }
  });

  it("형식은 맞지만 존재하지 않는 날짜를 거른다", () => {
    expect(isValidBucketDate("2026-02-31")).toBe(false);
    expect(isValidBucketDate("2026-13-01")).toBe(false);
  });
});

describe("formatBucketDateLabel", () => {
  it("요일까지 붙인다", () => {
    // 2026-08-23은 일요일
    expect(formatBucketDateLabel("2026-08-23")).toBe("2026년 8월 23일 (일)");
  });

  it("시간대와 무관하게 같은 문자열을 낸다 (hydration 안정성)", () => {
    const tz = process.env.TZ;
    const results = ["UTC", "Asia/Seoul", "America/New_York"].map((z) => {
      process.env.TZ = z;
      return formatBucketDateLabel("2026-01-01");
    });
    process.env.TZ = tz;
    expect(new Set(results).size).toBe(1);
  });
});

describe("formatBucketDateShort", () => {
  it("연도를 뺀다", () => {
    expect(formatBucketDateShort("2026-08-23")).toBe("8월 23일");
  });
});

describe("shiftBucketDate", () => {
  it("앞뒤로 이동한다", () => {
    expect(shiftBucketDate("2026-08-23", 1)).toBe("2026-08-24");
    expect(shiftBucketDate("2026-08-23", -1)).toBe("2026-08-22");
  });

  it("월·연 경계를 넘는다", () => {
    expect(shiftBucketDate("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftBucketDate("2026-01-01", -1)).toBe("2025-12-31");
  });
});
