import { describe, it, expect } from "vitest";
import { buildClusterSummary } from "./summary";
import type { SummaryArticle, SummaryOutlet } from "./summary";

const OUTLETS: SummaryOutlet[] = [
  { id: "hani", name: "한겨레신문", leaning: "left" },
  { id: "khan", name: "경향신문", leaning: "center_left" },
  { id: "ohmynews", name: "오마이뉴스", leaning: "left" },
  { id: "yonhap", name: "연합뉴스", leaning: "center" },
  { id: "sbs", name: "SBS", leaning: "center" },
  { id: "chosun", name: "조선일보", leaning: "right" },
  { id: "donga", name: "동아일보", leaning: "center_right" },
  { id: "segye", name: "세계일보", leaning: "right" },
];

// KST 06:12 = UTC 21:12 (전날)
const at = (iso: string) => new Date(iso);
const article = (outletId: string, iso: string): SummaryArticle => ({
  outletId,
  publishedAt: at(iso),
});

describe("buildClusterSummary", () => {
  it("기사가 없으면 null", () => {
    expect(buildClusterSummary([], OUTLETS)).toBeNull();
  });

  it("명단에 없는 언론사만 있으면 null", () => {
    expect(buildClusterSummary([article("ghost", "2026-08-26T00:00:00Z")], OUTLETS)).toBeNull();
  });

  it("한 곳만 보도하면 그 매체를 이름으로 지목한다", () => {
    const s = buildClusterSummary([article("yonhap", "2026-08-26T00:00:00Z")], OUTLETS)!;
    expect(s).toContain("연합뉴스 한 곳만 이 사건을 보도했습니다.");
  });

  it("진영별 보도 매체 수를 센다", () => {
    const s = buildClusterSummary(
      [
        article("hani", "2026-08-25T21:12:00Z"),
        article("khan", "2026-08-25T22:00:00Z"),
        article("yonhap", "2026-08-25T23:00:00Z"),
        article("chosun", "2026-08-26T00:00:00Z"),
      ],
      OUTLETS
    )!;
    expect(s).toContain("4개 언론사가 이 사건을 보도했습니다 — 진보 2곳, 중도 1곳, 보수 1곳.");
  });

  it("같은 매체가 여러 건 써도 언론사 수는 하나로 센다", () => {
    const s = buildClusterSummary(
      [
        article("hani", "2026-08-25T21:12:00Z"),
        article("hani", "2026-08-25T22:12:00Z"),
        article("chosun", "2026-08-25T23:12:00Z"),
      ],
      OUTLETS
    )!;
    expect(s).toContain("2개 언론사가");
  });

  describe("침묵", () => {
    it("한 진영이 통째로 빠지면 그 진영과 매체 이름을 짚는다", () => {
      const s = buildClusterSummary(
        [
          article("hani", "2026-08-25T21:12:00Z"),
          article("khan", "2026-08-25T21:20:00Z"),
          article("ohmynews", "2026-08-25T21:30:00Z"),
          article("yonhap", "2026-08-25T21:40:00Z"),
          article("sbs", "2026-08-25T21:50:00Z"),
        ],
        OUTLETS
      )!;
      // 3곳 이하이므로 이름을 모두 적는다
      expect(s).toContain("보수 성향 매체 3곳(조선일보·동아일보·세계일보)");
      expect(s).toContain("관련 보도가 확인되지 않았습니다.");
    });

    it("두 진영 이상이 빠지면 이름 없이 진영만 말한다", () => {
      const s = buildClusterSummary([article("hani", "2026-08-25T21:12:00Z")], OUTLETS)!;
      expect(s).toContain("중도·보수 성향 매체 5곳에서는 관련 보도가 확인되지 않았습니다.");
    });

    it("통째로 빠진 진영이 없으면 개별 매체를 나열한다", () => {
      const s = buildClusterSummary(
        [
          article("hani", "2026-08-25T21:12:00Z"),
          article("yonhap", "2026-08-25T21:20:00Z"),
          article("chosun", "2026-08-25T21:30:00Z"),
        ],
        OUTLETS
      )!;
      expect(s).toContain("등 5곳에서는 관련 보도가 확인되지 않았습니다.");
      expect(s).not.toContain("성향 매체");
    });

    it("모든 매체가 보도했으면 침묵 문장이 없다", () => {
      const s = buildClusterSummary(
        OUTLETS.map((o, i) => article(o.id, `2026-08-25T21:${String(i).padStart(2, "0")}:00Z`)),
        OUTLETS
      )!;
      expect(s).not.toContain("확인되지 않았습니다");
    });

    it("이름이 3곳을 넘으면 접는다", () => {
      const s = buildClusterSummary(
        [
          article("hani", "2026-08-25T21:12:00Z"),
          article("yonhap", "2026-08-25T21:20:00Z"),
          article("chosun", "2026-08-25T21:30:00Z"),
        ],
        OUTLETS
      )!;
      // 침묵 5곳. 진보 → 중도 → 보수 순으로 나열하고 앞 3개만 적는다
      expect(s).toContain("경향신문·오마이뉴스·SBS 등 5곳에서는");
    });
  });

  describe("보도 시차", () => {
    it("한 진영만 보도했으면 시차를 말하지 않는다", () => {
      const s = buildClusterSummary(
        [article("hani", "2026-08-25T21:12:00Z"), article("khan", "2026-08-26T06:00:00Z")],
        OUTLETS
      )!;
      expect(s).not.toContain("따라왔습니다");
    });

    it("1시간 미만이면 시차를 말하지 않는다", () => {
      const s = buildClusterSummary(
        [article("hani", "2026-08-25T21:12:00Z"), article("chosun", "2026-08-25T21:50:00Z")],
        OUTLETS
      )!;
      expect(s).not.toContain("따라왔습니다");
    });

    it("최초 보도 매체와 KST 시각, 뒤따른 진영의 시차를 적는다", () => {
      const s = buildClusterSummary(
        [
          article("hani", "2026-08-25T21:12:00Z"), // KST 06:12
          article("yonhap", "2026-08-25T23:12:00Z"), // KST 08:12
          article("chosun", "2026-08-26T06:12:00Z"), // KST 15:12 → 9시간 뒤
        ],
        OUTLETS
      )!;
      expect(s).toContain("최초 보도는 한겨레신문(06:12), 보수 성향 매체는 9시간 뒤에");
    });

    it("진영의 최초 시각으로 계산한다 (그 진영의 늦은 후속 기사에 끌려가지 않는다)", () => {
      const s = buildClusterSummary(
        [
          article("hani", "2026-08-25T21:12:00Z"),
          article("chosun", "2026-08-25T23:12:00Z"), // 보수 최초 = 2시간 뒤
          article("segye", "2026-08-26T12:12:00Z"), // 같은 진영 후속
        ],
        OUTLETS
      )!;
      expect(s).toContain("보수 성향 매체는 2시간 뒤에");
    });
  });

  it("언론사 이름 뒤에 조사를 붙이지 않는다 — 받침에 따라 틀린 조사가 나온다", () => {
    // "서울신문였고"(X) / "서울신문이었고"(O). 쉼표로 끊어 이 문제를 아예 만들지 않는다.
    const s = buildClusterSummary(
      [
        article("sbs", "2026-08-25T21:12:00Z"),
        article("chosun", "2026-08-26T06:12:00Z"),
        article("hani", "2026-08-26T07:12:00Z"),
      ],
      OUTLETS
    )!;
    expect(s).toContain("최초 보도는 SBS(06:12),");
    expect(s).not.toMatch(/(였고|이었고)/);
  });

  it("문장 순서는 보도 → 침묵 → 시차다", () => {
    const s = buildClusterSummary(
      [
        article("hani", "2026-08-25T21:12:00Z"),
        article("khan", "2026-08-25T21:20:00Z"),
        article("chosun", "2026-08-26T06:12:00Z"),
      ],
      OUTLETS
    )!;
    expect(s.indexOf("보도했습니다")).toBeLessThan(s.indexOf("확인되지 않았습니다"));
    expect(s.indexOf("확인되지 않았습니다")).toBeLessThan(s.indexOf("최초 보도는"));
  });

  it("실행할 때마다 같은 문장을 낸다 (언론사 순서에 흔들리지 않는다)", () => {
    const articles = [article("hani", "2026-08-25T21:12:00Z")];
    const a = buildClusterSummary(articles, OUTLETS);
    const b = buildClusterSummary(articles, [...OUTLETS].reverse());
    expect(a).toBe(b);
  });
});
