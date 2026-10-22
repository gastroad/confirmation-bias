import { describe, it, expect } from "vitest";
import { isPhotoCaption, representativeIndex } from "./representative";
import { normalizeInPlace } from "./vector";

describe("isPhotoCaption", () => {
  it.each([
    "[포토] 국정감사 들어서는 오세훈 서울시장",
    "[오마이포토] '박근혜 파이팅' 외친 국민의힘",
    "[포토뉴스]텅 빈 중수청 앞…국힘 ‘규탄’ 의원총회",
    "전대 D-1, 당권주자들의 마지막 호소 [한강로 사진관]",
    "李대통령, 文 전 대통령과 청와대서 취임 후 첫 회동 [청계천 옆 사진관]",
    "소년공 출신 두 대통령, 5개월 만에 재회의 포옹 [현장 화보]",
    "손 맞잡은 이 대통령·문 전 대통령 ‘통합 비빔밥’ 만찬 [포토]",
  ])("꼬리표가 있으면 캡션이다 — %s", (title) => {
    expect(isPhotoCaption(title)).toBe(true);
  });

  it.each([
    // 사진이 기사의 소재인 경우
    "실수로 김일성 사진 찢은 북 대표 “남측이 도발”",
    "李대통령, 광복절 경축사서 “대체불가 대한민국으로”…대북 청사진도 제시",
    '[남북회담문서] 南이 건넨 김일성 사진 찢은 北, 깨닫고 "완전도발" 소동',
    // 다른 꼬리표
    "[속보] 정청래, 민주 당대표 경선 부산·울산·경남 당원투표 승리",
    "[영상] 국감장 고성",
    "민주당, 김승원 청문보고서 채택… 野 “국민과의 전쟁”(종합)",
  ])("본 기사는 캡션이 아니다 — %s", (title) => {
    expect(isPhotoCaption(title)).toBe(false);
  });
});

describe("representativeIndex", () => {
  const v = (...xs: number[]) => normalizeInPlace(Float32Array.from(xs));

  it("centroid 최근접이 캡션이면 그다음으로 가까운 본 기사를 고른다", () => {
    // 캡션 셋이 한쪽으로 몰려 centroid를 끌어당긴다 — 실제로 일어나는 모양이다
    const vectors = [v(1, 0), v(1, 0.05), v(0.98, 0.02), v(0.6, 0.8)];
    const titles = ["[포토] 발언하는 A", "[포토] 발언하는 A 의원", "[포토] A", "A, 법안 발의"];
    expect(representativeIndex(vectors, titles, [0, 1, 2, 3])).toBe(3);
  });

  it("캡션이 없으면 centroid 최근접 그대로다 (기존 동작)", () => {
    const vectors = [v(1, 0), v(0, 1), v(0.7, 0.7)];
    const titles = ["가", "나", "다"];
    expect(representativeIndex(vectors, titles, [0, 1, 2])).toBe(2);
  });

  it("전부 캡션이면 캡션 중에서 고른다 — 제목이 비지 않는다", () => {
    const vectors = [v(1, 0), v(0.7, 0.7), v(0, 1)];
    const titles = ["[포토] 가", "[포토] 나", "[포토] 다"];
    expect(representativeIndex(vectors, titles, [0, 1, 2])).toBe(1);
  });

  it("본 기사가 하나뿐이면 그 기사다", () => {
    const vectors = [v(1, 0), v(1, 0.01), v(0, 1)];
    const titles = ["[포토] 가", "[포토] 나", "본 기사"];
    expect(representativeIndex(vectors, titles, [0, 1, 2])).toBe(2);
  });

  it("그룹 인덱스는 전체 배열을 가리킨다 — 하루치 배열의 일부만 그룹이다", () => {
    const vectors = [v(0, 1), v(1, 0), v(1, 0.1)];
    const titles = ["다른 그룹", "[포토] 가", "가 발표"];
    expect(representativeIndex(vectors, titles, [1, 2])).toBe(2);
  });
});
