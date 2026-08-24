// 임베딩은 OpenAI가 사실상 단위벡터로 돌려주지만(실측 L2 norm 0.99933~1.00058),
// 512차원으로 자르면서 생긴 오차가 있어 배치 진입 시 한 번 재정규화한다(vector.ts).
// 정규화된 뒤에는 코사인 유사도가 내적과 같아지므로 hac.ts는 dot()만 쓴다.

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) throw new Error("Vector dimension mismatch");

  let d = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : d / denom;
}

export function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}
