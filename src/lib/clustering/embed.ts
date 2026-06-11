import OpenAI from "openai";

const client = new OpenAI();

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 512,
  });
  return res.data[0].embedding;
}
