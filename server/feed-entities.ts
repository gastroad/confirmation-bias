/**
 * 피드 텍스트에 섞여 오는 HTML 엔티티를 사람이 읽는 문자로 되돌린다.
 *
 * **프레시안 피드는 `&`가 빠진 채로 온다.** 원본 XML에 literal `quot;` · `hellip;` ·
 * `middot;` 가 들어 있다(2026-08-27 원문 확인). 우리 파서 문제가 아니라 발행 쪽 인코딩
 * 버그지만, 그대로 두면 `김민석 quot;제주 실종 허위종결quot;` 같은 제목이 우리 페이지와
 * 검색 결과에 그대로 나간다. 실측으로 기사 608건(2.3%) · 클러스터 대표 제목 185개(1.7%)가
 * 이 상태였다. → docs/agent/rss-feeds.md
 *
 * 그래서 두 형태를 **순서대로** 처리한다.
 *   1. 정상 엔티티(`&`가 있는 것)를 최대 두 번 푼다 — 이중 인코딩(`&amp;quot;`)이 실제로 온다.
 *   2. 그러고도 남은 `&` 없는 잔재(`quot;`)를 푼다.
 *
 * 두 단계를 합쳐 한 번에 훑으면 안 된다. `&`를 선택적으로 두면 `&amp;quot;`에서 `&amp;`와
 * `quot;`가 같은 패스에 각각 잡혀 `&"`가 되어 버린다.
 *
 * 잔재 복원은 원문을 건드리는 일이라 **아래 목록에 있는 이름만** 바꾼다. 한국어 기사
 * 제목에 "middot;" 같은 문자열이 그 자체로 등장할 일은 없다.
 */

const NAMED: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  hellip: "…",
  middot: "·",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  ndash: "–",
  mdash: "—",
};

const NAMES = Object.keys(NAMED).join("|");

const PROPER_NAMED = new RegExp(`&(${NAMES});`, "g");
const PROPER_DEC = /&#(\d{1,7});/g;
const PROPER_HEX = /&#[xX]([0-9a-fA-F]{1,6});/g;

// 앞에 `&`가 없는 잔재만. 정상 엔티티를 다 푼 뒤에 돌아야 한다.
const BARE_NAMED = new RegExp(`(?<!&)(${NAMES});`, "g");

function fromCode(original: string, code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return original;
  try {
    return String.fromCodePoint(code);
  } catch {
    return original;
  }
}

function decodeProper(input: string): string {
  return input
    .replace(PROPER_HEX, (m, hex: string) => fromCode(m, parseInt(hex, 16)))
    .replace(PROPER_DEC, (m, dec: string) => fromCode(m, Number(dec)))
    .replace(PROPER_NAMED, (_, name: string) => NAMED[name]);
}

export function decodeFeedEntities(input: string): string {
  if (!input) return input;
  // 두 번까지만. 이중 인코딩은 실제로 오지만 삼중은 오지 않고, 무한히 반복하면 본문에
  // 원래 있던 "&amp;" 같은 문자열까지 계속 파고든다.
  const proper = decodeProper(decodeProper(input));
  return proper.replace(BARE_NAMED, (_, name: string) => NAMED[name]);
}
