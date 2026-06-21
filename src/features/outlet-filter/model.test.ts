import { describe, it, expect } from "vitest";
import { parseOutletParam } from "./model";

describe("parseOutletParam", () => {
  it("빈 값이면 빈 배열을 반환한다", () => {
    expect(parseOutletParam(undefined)).toEqual([]);
    expect(parseOutletParam(null)).toEqual([]);
    expect(parseOutletParam("")).toEqual([]);
  });

  it("콤마로 분리해 유효한 id를 반환한다", () => {
    expect(parseOutletParam("chosun,hani")).toEqual(["chosun", "hani"]);
  });

  it("공백을 제거한다", () => {
    expect(parseOutletParam(" chosun , hani ")).toEqual(["chosun", "hani"]);
  });

  it("OUTLET_MAP에 없는 id는 버린다", () => {
    expect(parseOutletParam("chosun,unknown_outlet,hani")).toEqual(["chosun", "hani"]);
  });

  it("중복을 제거하고 입력 순서를 유지한다", () => {
    expect(parseOutletParam("hani,chosun,hani")).toEqual(["hani", "chosun"]);
  });

  it("유효한 id가 하나도 없으면 빈 배열이다", () => {
    expect(parseOutletParam("foo,bar")).toEqual([]);
  });
});
