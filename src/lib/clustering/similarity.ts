export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vector dimension mismatch");

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

// Weighted moving average: incorporates new vector into existing centroid
export function updateCentroid(
  centroid: number[],
  newVec: number[],
  existingCount: number
): number[] {
  const updated = centroid.map(
    (v, i) => (v * existingCount + newVec[i]) / (existingCount + 1)
  );
  return normalizeVector(updated);
}
