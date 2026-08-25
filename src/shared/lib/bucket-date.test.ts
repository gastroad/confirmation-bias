import { describe, it, expect } from "vitest";
import {
  isValidBucketDate,
  formatBucketDateLabel,
  formatBucketDateShort,
  formatBucketDateNumeric,
  bucketDateWeekday,
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

describe("formatBucketDateNumeric", () => {
  it("월·일을 두 자리로 채운다", () => {
    expect(formatBucketDateNumeric("2026-08-24")).toBe("2026.08.24");
    expect(formatBucketDateNumeric("2026-01-05")).toBe("2026.01.05");
  });

  it("UTC로 계산해 시간대와 무관하게 같은 값을 낸다", () => {
    const tz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    expect(formatBucketDateNumeric("2026-08-24")).toBe("2026.08.24");
    process.env.TZ = tz;
  });
});

describe("bucketDateWeekday", () => {
  it("KST 기준일의 요일을 한 글자로 돌려준다", () => {
    expect(bucketDateWeekday("2026-08-24")).toBe("월");
    expect(bucketDateWeekday("2026-08-23")).toBe("일");
    expect(bucketDateWeekday("2026-08-29")).toBe("토");
  });
});
