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

export function isPhotoCaption(title: string): boolean {
  return PHOTO_TAG.test(title);
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
