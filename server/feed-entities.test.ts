import { describe, it, expect } from "vitest";
import { decodeFeedEntities } from "./feed-entities";

describe("decodeFeedEntities", () => {
  it("빈 문자열은 그대로", () => {
    expect(decodeFeedEntities("")).toBe("");
  });

  it("엔티티가 없으면 건드리지 않는다", () => {
    expect(decodeFeedEntities("국회 본회의 통과")).toBe("국회 본회의 통과");
  });

  it("정상 엔티티를 푼다", () => {
    expect(decodeFeedEntities("가 &quot;나&quot; 다")).toBe('가 "나" 다');
    expect(decodeFeedEntities("가&hellip;나&middot;다")).toBe("가…나·다");
  });

  it("이중 인코딩을 두 번 푼다", () => {
    expect(decodeFeedEntities("가 &amp;quot;나&amp;quot; 다")).toBe('가 "나" 다');
  });

  it("&가 빠진 잔재를 되살린다 — 프레시안 피드의 실제 형태", () => {
    expect(decodeFeedEntities("국민의힘 quot;의원연찬회에 박근혜 초청quot;")).toBe(
      '국민의힘 "의원연찬회에 박근혜 초청"'
    );
    expect(
      decodeFeedEntities("민주당 새 지도부, 대법원 맹폭hellip;quot;조희대 씨, 당장 나가라quot;")
    ).toBe('민주당 새 지도부, 대법원 맹폭…"조희대 씨, 당장 나가라"');
  });

  it("숫자 엔티티도 푼다", () => {
    expect(decodeFeedEntities("&#39;장외투쟁&#39;")).toBe("'장외투쟁'");
    expect(decodeFeedEntities("&#x27;장외투쟁&#x27;")).toBe("'장외투쟁'");
  });

  it("엔티티가 아닌 &는 남긴다", () => {
    expect(decodeFeedEntities("AT&T 인수")).toBe("AT&T 인수");
    expect(decodeFeedEntities("가 & 나")).toBe("가 & 나");
  });

  it("목록에 없는 엔티티는 그대로 둔다 — 원문을 함부로 바꾸지 않는다", () => {
    expect(decodeFeedEntities("&copy; 2026")).toBe("&copy; 2026");
    expect(decodeFeedEntities("copy; 2026")).toBe("copy; 2026");
  });

  it("범위를 벗어난 코드포인트는 원문을 유지한다", () => {
    expect(decodeFeedEntities("&#99999999;")).toBe("&#99999999;");
    expect(decodeFeedEntities("&#0;")).toBe("&#0;");
  });

  it("멱등하다 — 이미 푼 문자열을 다시 넣어도 같다", () => {
    const once = decodeFeedEntities("국민의힘 quot;의원연찬회quot;");
    expect(decodeFeedEntities(once)).toBe(once);
  });
});
