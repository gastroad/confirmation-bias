import { dot } from "./similarity";

export interface AgglomerateOptions {
  /** 이 코사인 유사도 미만에서는 병합을 멈춘다. */
  threshold: number;
  /**
   * 이 크기를 넘게 만드는 병합은 건너뛴다. average linkage만으로도 대부분 막히지만,
   * 정치 뉴스는 "같은 인물이 언급됨"만으로 뭉치는 경향이 있어 안전핀을 둔다.
   * (증분 배정 시절 253건짜리 블랙홀 클러스터가 생겼던 지점)
   */
  maxClusterSize?: number;
}

/**
 * 응집 계층 클러스터링 (average linkage / UPGMA).
 *
 * **입력 벡터는 정규화되어 있어야 한다** — 유사도를 내적으로만 계산한다(vector.ts의 normalizeInPlace).
 *
 * average linkage를 쓰는 이유: single linkage는 chaining이 심해 A-B, B-C가 가까우면
 * A-C가 멀어도 한 덩어리가 된다. 증분 배정에서 겪던 블랙홀 문제가 그대로 재현된다.
 *
 * 복잡도는 병합 1회당 O(활성²)이라 최악 O(n³). 실제 데이터는 하루 300~700건이고
 * threshold에서 일찍 멈춰 병합 횟수가 n보다 훨씬 적다(대부분 클러스터가 1~10건).
 * **하루 유입이 2,000건을 넘으면** nearest-neighbor chain 알고리즘(O(n²) 보장)으로 교체할 것.
 *
 * @returns 원소 인덱스 그룹. 입력 순서 기준으로 결정적이다.
 */
export function agglomerate(
  vectors: readonly Float32Array[],
  { threshold, maxClusterSize }: AgglomerateOptions
): number[][] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [[0]];

  // 상삼각만 쓰는 대신 n×n 전체를 채운다. n=700이어도 490k float = 2MB라 부담이 없고,
  // 병합 갱신 루프에서 인덱스 변환이 사라져 읽기 쉬워진다.
  const sim = new Float32Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = dot(vectors[i], vectors[j]);
      sim[i * n + j] = s;
      sim[j * n + i] = s;
    }
  }

  const members: number[][] = Array.from({ length: n }, (_, i) => [i]);
  const active: number[] = Array.from({ length: n }, (_, i) => i);

  while (active.length > 1) {
    let bestScore = -Infinity;
    let a = -1;
    let b = -1;

    for (let x = 0; x < active.length; x++) {
      const i = active[x];
      for (let y = x + 1; y < active.length; y++) {
        const j = active[y];
        const s = sim[i * n + j];
        if (s <= bestScore) continue;
        // 크기 제약은 유사도 행렬을 건드리지 않고 탐색에서만 거른다.
        // 행렬에 sentinel을 쓰면 이후 Lance-Williams 평균에 섞여 들어간다.
        if (maxClusterSize && members[i].length + members[j].length > maxClusterSize) continue;
        bestScore = s;
        a = i;
        b = j;
      }
    }

    if (a === -1 || bestScore < threshold) break;

    // Lance-Williams (average linkage): sim(A∪B, C) = (|A|·sim(A,C) + |B|·sim(B,C)) / (|A|+|B|)
    const sizeA = members[a].length;
    const sizeB = members[b].length;
    for (const c of active) {
      if (c === a || c === b) continue;
      const merged = (sizeA * sim[a * n + c] + sizeB * sim[b * n + c]) / (sizeA + sizeB);
      sim[a * n + c] = merged;
      sim[c * n + a] = merged;
    }

    members[a] = members[a].concat(members[b]);
    members[b] = [];
    active.splice(active.indexOf(b), 1);
  }

  return active.map((i) => members[i]);
}
