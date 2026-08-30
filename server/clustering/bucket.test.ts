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

// ─────────────────────────────────────────────────────────────────────────────
// cron 스케줄과의 정합
//
// GitHub Actions runner는 **UTC**로 돈다. `cluster-day.ts`가 "어제(KST)"를 고를 때
// 실행 환경의 타임존을 따랐다면 runner에서 하루가 밀린 날짜를 클러스터링했을 것이다.
// (`shared/lib/format.ts`가 실제로 그 실수를 하고 있었다 — 2026-08-27에 KST로 고정.)
//
// 워크플로의 cron을 **파일에서 직접 읽어** 검증한다. cron을 잘못 옮기면 여기서 깨진다.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** `cluster-daily.yml`의 cron에서 UTC 시각(hour)을 뽑는다. */
function clusterDailyCronHourUtc(): number {
  const yml = readFileSync(join(repoRoot, ".github/workflows/cluster-daily.yml"), "utf8");
  const m = /cron:\s*["']\s*(\d+)\s+(\d+)\s+\*\s+\*\s+\*\s*["']/.exec(yml);
  if (!m) throw new Error("cluster-daily.yml에서 cron을 찾지 못했습니다");
  return Number(m[2]);
}

/** 스크립트의 기본값과 같은 계산: 지금이 속한 KST 버킷의 전날. */
function targetBucketAt(now: Date): string {
  return formatBucketDate(new Date(toBucketDate(now).getTime() - 24 * 60 * 60 * 1000));
}

describe("cluster-daily cron", () => {
  it("KST 새벽에 돈다 — 하루가 닫힌 뒤여야 그날 기사가 다 모인다", () => {
    const utcHour = clusterDailyCronHourUtc();
    const kstHour = (utcHour + 9) % 24;
    expect(kstHour).toBeGreaterThanOrEqual(1);
    expect(kstHour).toBeLessThan(12);
  });

  it("cron이 트리거된 시각에 '어제(KST)'를 고른다", () => {
    const utcHour = clusterDailyCronHourUtc();
    // 2026-08-26 UTC 20:00 = 2026-08-27 KST 05:00 → 대상은 2026-08-26
    const fire = new Date(Date.UTC(2026, 7, 26, utcHour, 0, 0));
    const kstDate = formatBucketDate(toBucketDate(fire));

    expect(kstDate).toBe("2026-08-27");
    expect(targetBucketAt(fire)).toBe("2026-08-26");
  });

  it("runner의 TZ가 무엇이든 같은 날짜를 고른다 — GitHub runner는 UTC다", () => {
    const fire = new Date(Date.UTC(2026, 7, 26, clusterDailyCronHourUtc(), 0, 0));
    const tz = process.env.TZ;
    const picked = ["UTC", "Asia/Seoul", "America/Los_Angeles", "Pacific/Auckland"].map((z) => {
      process.env.TZ = z;
      return targetBucketAt(fire);
    });
    process.env.TZ = tz;

    expect(new Set(picked)).toEqual(new Set(["2026-08-26"]));
  });

  /**
   * GitHub의 schedule은 **지연된다.** 실측(2026-08-26)으로 예정보다 2시간 35분 늦게 돈 적이 있다.
   * 대상 날짜가 바뀌려면 KST 자정을 넘겨야 하므로, cron 시각에서 그때까지의 여유가 곧 안전 마진이다.
   */
  it("지연에 대한 안전 마진이 반나절 이상이다", () => {
    const utcHour = clusterDailyCronHourUtc();
    const fire = new Date(Date.UTC(2026, 7, 26, utcHour, 0, 0));
    const target = targetBucketAt(fire);

    // KST 자정 직전까지는 대상이 그대로다
    const kstMidnightUtc = new Date(Date.UTC(2026, 7, 27, 15, 0, 0));
    const marginHours = (kstMidnightUtc.getTime() - fire.getTime()) / 3600_000;
    expect(marginHours).toBeGreaterThanOrEqual(12);

    const justBefore = new Date(kstMidnightUtc.getTime() - 60_000);
    expect(targetBucketAt(justBefore)).toBe(target);
    // 자정을 넘기면 하루가 밀린다 — 그때는 놓친 날짜를 --date로 따로 돌려야 한다
    expect(targetBucketAt(kstMidnightUtc)).not.toBe(target);
  });
});

describe("collect cron", () => {
  it("3시간마다 돌고 정각을 피한다 — 정각은 GitHub 부하로 지연·드롭이 잦다", () => {
    const yml = readFileSync(join(repoRoot, ".github/workflows/collect.yml"), "utf8");
    const m = /cron:\s*["']\s*(\d+)\s+\*\/(\d+)\s+\*\s+\*\s+\*\s*["']/.exec(yml);
    expect(m, "collect.yml의 cron을 찾지 못했습니다").not.toBeNull();

    const [, minute, everyHours] = m!;
    expect(Number(minute)).toBeGreaterThan(0);
    expect(Number(everyHours)).toBeLessThanOrEqual(3);
  });
});
