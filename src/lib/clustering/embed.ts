export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const body = JSON.stringify({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 512,
  });

  let lastErr: unknown;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (res.ok) {
        const json = await res.json() as { data: { embedding: number[] }[] };
        return json.data[0].embedding;
      }

      const errText = await res.text();

      if (res.status === 401 || res.status === 403) {
        throw new Error(`OpenAI ${res.status}: ${errText}`);
      }

      lastErr = new Error(`OpenAI ${res.status}: ${errText}`);
      // 431 = stale Cloudflare edge connection; longer delay to force new connection
      const delay = res.status === 431 ? 3000 * attempt : 500 * attempt;
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      // Re-throw auth errors immediately
      if (err instanceof Error && /OpenAI 40[13]/.test(err.message)) throw err;

      lastErr = err;
      // ECONNRESET or other network errors: wait then retry with fresh connection
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  throw lastErr;
}
