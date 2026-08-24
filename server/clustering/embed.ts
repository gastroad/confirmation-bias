// OpenAI embeddings는 input에 배열을 받는다. 기사마다 1 request를 던지던 것을
// 배치로 묶어 왕복 횟수를 100분의 1로 줄인다(일별 배치는 하루 수백 건을 한 번에 처리한다).
const MODEL = "text-embedding-3-small";
const DIMENSIONS = 512;
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 5;

async function requestEmbeddings(inputs: string[], apiKey: string): Promise<number[][]> {
  const body = JSON.stringify({ model: MODEL, input: inputs, dimensions: DIMENSIONS });
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
        // 응답 순서가 요청 순서와 같다는 보장이 없어 index로 되돌린다.
        const out = new Array<number[]>(inputs.length);
        for (const d of json.data) out[d.index] = d.embedding;
        return out;
      }

      const errText = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(`OpenAI ${res.status}: ${errText}`);
      }

      lastErr = new Error(`OpenAI ${res.status}: ${errText}`);
      // 431 = stale Cloudflare edge connection; 새 커넥션을 강제하려 더 길게 쉰다
      await new Promise((r) => setTimeout(r, res.status === 431 ? 3000 * attempt : 500 * attempt));
    } catch (err) {
      if (err instanceof Error && /OpenAI 40[13]/.test(err.message)) throw err;
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  throw lastErr;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (texts.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await requestEmbeddings(texts.slice(i, i + BATCH_SIZE), apiKey)));
  }
  return out;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}
