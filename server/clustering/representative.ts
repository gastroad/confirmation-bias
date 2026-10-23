import { dot } from "./similarity";
import { centroidOf } from "./vector";

/**
 * 사진 기사 판정 — **괄호 꼬리표 안에 포토·사진·화보가 있는가.**
 *
 * 2026-10-23 실측으로 전체 기사 61,082건 중 1,856건(3.0%)이 걸리고, 그중 1,638건이
 * 천지일보의 `[포토]`다(천지일보 기사의 51%). 매체마다 꼬리표가 다르고 앞·뒤 어디에나 붙는다.
 *
 * ```
 * [포토] 국정감사 들어서는 오세훈 서울시장          천지일보·한국경제·한겨레·서울신문
 * [오마이포토] · [포토뉴스] · [경향포토] · [화보]      오마이뉴스·경향신문
 * … 당권주자들의 마지막 호소 [한강로 사진관]         세계일보 (꼬리)
 * … [청계천 옆 사진관] · [현장 화보] · [만리재사진첩]  동아일보·경향신문·한겨레
 * ```
 *
 * **꼬리표가 없는 문장 속 "사진"은 걸지 않는다** — "김일성 사진 찢은 北", "청사진 제시"처럼
 * 사진이 기사의 소재인 경우가 그만큼 많다(꼬리표 없이 "사진"이 들어간 제목 중 캡션은 표본
 * 25건에 0건). 둥근 괄호도 걸지 않는다. `(종합)`·`(사진=…)` 같은 꼬리는 본 기사에 붙는다.
 */
const PHOTO_TAG = /[[【〈<][^\]】〉>]*(?:포토|사진|화보)[^\]】〉>]*[\]】〉>]/;

/**
 * 꼬리표 없는 캡션 판정 — **문장이 아닌 제목: 관형형 + 인물·직함으로 끝나고 문장부호가 없다.**
 *
 * ```
 * 최고위 참석하는 김민석 대표                 서울신문 (꼬리표를 아예 달지 않는다)
 * 국정감사대책회의 발언하는 한병도 원내대표
 * 루비오 미 국무장관 만난 조현 장관           천지일보 (같은 매체도 꼬리표를 빼먹는다)
 * ```
 *
 * 태그된 캡션을 빼자 같은 매체의 **안 태그된 캡션**이 그 자리를 이어받았다. 2026-10-23 기준
 * 대표 제목 42개가 이 모양이고, 2026-10-22 라이브 주간 리포트 3위·9위가 이것이었다. 꼬리표가
 * 없으니 단어로는 못 가르고 **문법으로** 가른다 — 기사 제목은 서술(따옴표·쉼표·말줄임)을 담고,
 * 캡션은 "무엇 하는 누구"라는 명사구다. 전체 기사 61,082건 중 67건이 걸리고 표본 전부가 캡션이다.
 *
 * 걸지 않는 것:
 * - 인용형 관형사(`다는`·`라는`) — "치킨값까지 챙긴다는 李대통령"은 주장을 옮긴 기사 제목이다.
 * - 관형형 바로 뒤에 직함만 오는 것 — "농지개혁에 실패한 대통령"은 인물이 아니라 논평이다.
 * - 이름 끝 받침 `ㄴ`·`전(前)` — "이사장에 정세균 전 국회의장"(인사 기사)이 걸려서 관형형을
 *   동사 어미로 좁혔다.
 */
const SENTENCE_MARK = /["'“”‘’…,?!:;·()[\]<>「」『』%~/=+]/;
const PERSON_TITLE =
  /(?:대통령|대표|의원|의원들|위원장|장관|시장|지사|총리|대변인|위원|총장|의장|원장|차관|청장|처장|실장|수석|후보|후보자|회장|당선인|여사|교육감|군수|대행|단장|지도부)$/;
const ADNOMINAL = /(?:는|던|한|은|난|된)$/;
const QUOTATIVE = /(?:다는|라는|냐는|자는)$/;
/** 관형형 뒤로 인물을 가리키는 명사구가 차지할 수 있는 어절 수(이름·소속·직함). */
const MAX_PERSON_PHRASE = 4;
const MAX_CAPTION_WORDS = 8;

function isUntaggedCaption(title: string): boolean {
  if (SENTENCE_MARK.test(title)) return false;
  const words = title.trim().split(/\s+/);
  if (words.length < 3 || words.length > MAX_CAPTION_WORDS) return false;
  if (!PERSON_TITLE.test(words[words.length - 1])) return false;

  const nearest = words.length - 3;
  const farthest = Math.max(0, words.length - 1 - MAX_PERSON_PHRASE);
  for (let i = nearest; i >= farthest; i--) {
    const w = words[i];
    if (w.length >= 2 && ADNOMINAL.test(w) && !QUOTATIVE.test(w)) return true;
  }
  return false;
}

export function isPhotoCaption(title: string): boolean {
  return PHOTO_TAG.test(title) || isUntaggedCaption(title);
}

/**
 * 그룹 centroid에 가장 가까운 기사. **사진 캡션은 후보에서 뺀다.**
 *
 * centroid 최근접은 "가장 많이 반복된 문장"에 끌려간다. 한 매체가 같은 장면의 캡션을 18건 낸
 * 그룹에서는 그 캡션들이 centroid를 자기 쪽으로 당기므로 **대표 제목이 캡션이 되는 게 구조적으로
 * 보장된다**(2026-10-23 기준 대표 제목이 사진 꼬리표인 클러스터 426개). 캡션은 사건이 아니라
 * 장면을 말하므로 이슈의 제목으로 세우지 않는다.
 *
 * centroid 자체는 캡션까지 포함해 잡는다 — 그 그룹이 무엇에 관한 것인지는 캡션도 말해 준다.
 * 전부 캡션이면 캡션 중에서 고른다(제목이 없는 것보다 낫다).
 */
export function representativeIndex(
  vectors: readonly Float32Array[],
  titles: readonly string[],
  group: readonly number[]
): number {
  if (group.length === 1) return group[0];

  const headlines = group.filter((i) => !isPhotoCaption(titles[i]));
  const candidates = headlines.length > 0 ? headlines : group;
  if (candidates.length === 1) return candidates[0];

  const centroid = centroidOf(vectors, group);
  return candidates.reduce(
    (best, i) => (dot(vectors[i], centroid) > dot(vectors[best], centroid) ? i : best),
    candidates[0]
  );
}
