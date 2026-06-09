import { normalizeVector } from "./similarity";

const EMBEDDING_DIM = 128;

// Keyword → dimension mapping: same-topic articles end up with high cosine similarity
// without a real API key. Replace generateEmbedding() body with an OpenAI call
// (text-embedding-3-small) or a local ONNX model when ready.
const TOPIC_KEYWORDS: [string, number][] = [
  // 의료·전공의
  ["전공의", 0], ["의대", 1], ["의사", 2], ["병원", 3], ["의료", 4], ["파업", 5],
  ["응급", 6], ["수련", 7], ["복지부", 8],
  // 반도체·HBM
  ["HBM", 15], ["하이닉스", 16], ["삼성전자", 17], ["반도체", 18], ["엔비디아", 19],
  ["메모리", 20], ["AI칩", 21], ["D램", 22],
  // 관세·무역
  ["관세", 30], ["무역", 31], ["트럼프", 32], ["수출", 33], ["협상", 34],
  ["통상", 35], ["미국", 36],
  // 부동산·주택
  ["아파트", 45], ["집값", 46], ["부동산", 47], ["재건축", 48], ["강남", 49],
  ["주택", 50], ["청약", 51], ["전세", 52],
  // 국회·입법
  ["국회", 60], ["법안", 61], ["특별법", 62], ["여야", 63], ["의결", 64],
  ["통과", 65], ["거부권", 66],
  // 에너지·기후
  ["재생에너지", 75], ["탄소", 76], ["원전", 77], ["에너지", 78], ["기후", 79],
  ["탈원전", 80], ["온실가스", 81],
];

export async function generateEmbedding(text: string): Promise<number[]> {
  // MVP: keyword-feature mock (deterministic, topically coherent)
  // Real implementation: call OpenAI/Anthropic embedding API here
  return mockEmbedding(text);
}

function mockEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0.01);

  for (const [keyword, dim] of TOPIC_KEYWORDS) {
    if (text.includes(keyword)) {
      vec[dim] += 1.0;
      if (dim > 0) vec[dim - 1] += 0.4;
      if (dim < EMBEDDING_DIM - 1) vec[dim + 1] += 0.4;
    }
  }

  // Add weak character-level noise so identical titles don't produce identical vectors
  for (let i = 0; i < text.length; i++) {
    vec[(text.charCodeAt(i) * 3 + i) % EMBEDDING_DIM] += 0.001;
  }

  return normalizeVector(vec);
}
