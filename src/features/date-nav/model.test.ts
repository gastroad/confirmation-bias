import { describe, it, expect } from "vitest";
import { parseDateParam, datePath, DATE_PARAM } from "./model";

describe("parseDateParam", () => {
  it("YYYY-MM-DD를 UTC 자정 Date로 만든다 — @db.Date 컬럼과 맞춘다", () => {
    expect(parseDateParam("2026-08-26")?.toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });

  it("값이 없으면 undefined (= 날짜 필터 없음)", () => {
    expect(parseDateParam(undefined)).toBeUndefined();
    expect(parseDateParam(null)).toBeUndefined();
    expect(parseDateParam("")).toBeUndefined();
  });

  it("형식이 어긋나면 undefined — 던지지 않는다", () => {
    // API 라우트가 사용자 입력을 그대로 넘긴다. 여기서 던지면 500이 난다.
    for (const v of ["2026/08/26", "20260826", "2026-8-6", "어제", "2026-08-26T00:00:00Z"]) {
      expect(parseDateParam(v)).toBeUndefined();
    }
  });

  it("존재하지 않는 날짜를 거른다 — Date 생성자의 자동 보정에 기대지 않는다", () => {
    // new Date("2026-02-31")은 3월 3일로 굴러간다. 그걸 그대로 쓰면
    // 사용자가 요청하지 않은 날짜의 목록이 나온다.
    expect(parseDateParam("2026-02-31")).toBeUndefined();
    expect(parseDateParam("2026-13-01")).toBeUndefined();
    expect(parseDateParam("2026-00-10")).toBeUndefined();
  });

  it("윤년 2월 29일은 통과시킨다", () => {
    expect(parseDateParam("2028-02-29")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(parseDateParam("2026-02-29")).toBeUndefined();
  });

  it("실행 환경 타임존에 흔들리지 않는다", () => {
    const tz = process.env.TZ;
    const results = ["UTC", "Asia/Seoul", "America/Los_Angeles"].map((z) => {
      process.env.TZ = z;
      return parseDateParam("2026-08-26")?.toISOString();
    });
    process.env.TZ = tz;
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe("2026-08-26T00:00:00.000Z");
  });
});

describe("datePath", () => {
  it("날짜 축은 쿼리가 아니라 path다 — canonical이 명확해진다", () => {
    expect(datePath("2026-08-26")).toBe("/d/2026-08-26");
  });

  it("필터가 없으면 쿼리를 붙이지 않는다 — 빈 파라미터가 canonical을 흩는다", () => {
    expect(datePath("2026-08-26", [])).toBe("/d/2026-08-26");
    expect(datePath("2026-08-26", []).includes("?")).toBe(false);
  });

  it("언론사 필터를 콤마로 이어 유지한다", () => {
    expect(datePath("2026-08-26", ["hani", "chosun"])).toBe("/d/2026-08-26?outlets=hani,chosun");
  });

  it("입력 순서를 그대로 유지한다 — 사용자가 고른 순서다", () => {
    expect(datePath("2026-08-26", ["chosun", "hani"])).toContain("outlets=chosun,hani");
  });
});

describe("DATE_PARAM", () => {
  it("API 라우트와 클라이언트가 같은 키를 쓴다", () => {
    expect(DATE_PARAM).toBe("date");
  });
});
