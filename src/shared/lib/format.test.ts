import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelative, formatDate } from "./format";

const NOW = "2026-08-26T12:00:00.000Z";

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => vi.useRealTimers());

  it("1시간 미만은 '방금 전'", () => {
    expect(formatRelative("2026-08-26T11:59:59.000Z")).toBe("방금 전");
    expect(formatRelative("2026-08-26T11:00:01.000Z")).toBe("방금 전");
  });

  it("정확히 1시간부터 시간 단위로 센다", () => {
    expect(formatRelative("2026-08-26T11:00:00.000Z")).toBe("1시간 전");
    expect(formatRelative("2026-08-26T01:00:00.000Z")).toBe("11시간 전");
  });

  it("23시간까지는 시간, 24시간부터 일 단위다", () => {
    expect(formatRelative("2026-08-25T13:00:00.000Z")).toBe("23시간 전");
    expect(formatRelative("2026-08-25T12:00:00.000Z")).toBe("1일 전");
  });

  it("여러 날 전은 일 단위로 내림한다", () => {
    expect(formatRelative("2026-08-24T13:00:00.000Z")).toBe("1일 전");
    expect(formatRelative("2026-08-20T12:00:00.000Z")).toBe("6일 전");
  });

  it("미래 시각도 '방금 전'으로 접는다 — 음수 시간을 노출하지 않는다", () => {
    // RSS의 pubDate가 앞선 시각으로 오는 일이 실제로 있다.
    expect(formatRelative("2026-08-26T13:00:00.000Z")).toBe("방금 전");
    expect(formatRelative("2026-08-27T12:00:00.000Z")).toBe("방금 전");
  });

  it("현재 타임존과 무관하게 같은 값을 낸다 — 경과 시간은 절대량이다", () => {
    const tz = process.env.TZ;
    const results = ["UTC", "Asia/Seoul", "America/New_York"].map((z) => {
      process.env.TZ = z;
      return formatRelative("2026-08-26T09:00:00.000Z");
    });
    process.env.TZ = tz;
    expect(new Set(results)).toEqual(new Set(["3시간 전"]));
  });
});

describe("formatDate", () => {
  it("KST 기준 월/일 시:분으로 적는다", () => {
    // UTC 00:30 = KST 09:30
    expect(formatDate("2026-08-26T00:30:00.000Z")).toBe("8/26 09:30");
  });

  it("KST 자정을 넘으면 날짜가 넘어간다", () => {
    // UTC 15:30 = 다음날 KST 00:30
    expect(formatDate("2026-01-02T15:30:00.000Z")).toBe("1/3 00:30");
  });

  it("시·분은 두 자리로 채우고 월·일은 채우지 않는다", () => {
    expect(formatDate("2026-01-04T16:05:00.000Z")).toBe("1/5 01:05");
  });

  /**
   * **렌더 위치에 따라 값이 갈리면 안 된다.**
   *
   * 이 값을 쓰는 자리가 서버(ClusterDetailView·admin)와 클라이언트(ClusterComments)에
   * 걸쳐 있다. 환경 타임존을 따르던 시절 Vercel 함수(UTC)가 기사 시각을 9시간 이르게
   * 렌더해, 같은 페이지의 댓글 시각(브라우저 로컬)과 기준이 갈렸다.
   */
  it("실행 환경 타임존과 무관하게 같은 값을 낸다 — 서버·클라이언트가 어긋나지 않는다", () => {
    const tz = process.env.TZ;
    const results = ["UTC", "Asia/Seoul", "America/New_York", "Pacific/Auckland"].map((z) => {
      process.env.TZ = z;
      return formatDate("2026-08-25T20:00:00.000Z");
    });
    process.env.TZ = tz;

    expect(new Set(results).size).toBe(1);
    // 실제 프로덕션에서 "8/25 20:00"으로 찍히던 그 기사다 (KST로는 8/26 05:00)
    expect(results[0]).toBe("8/26 05:00");
  });

  it("클러스터의 KST 기준일과 어긋나지 않는다", () => {
    // KST 하루의 양 끝. 둘 다 2026-08-26 버킷에 속한다.
    expect(formatDate("2026-08-25T15:00:00.000Z")).toBe("8/26 00:00");
    expect(formatDate("2026-08-26T14:59:00.000Z")).toBe("8/26 23:59");
  });
});
