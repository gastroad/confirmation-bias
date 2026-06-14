export async function llmJudge(
  candidateText: string,
  clusterTitle: string
): Promise<boolean> {
  if (process.env.NODE_ENV === "test" || !process.env.OPENAI_API_KEY) {
    return mockJudge(candidateText, clusterTitle);
  }

  return realJudge(candidateText, clusterTitle);
}

function mockJudge(candidateText: string, clusterTitle: string): boolean {
  const candidateWords = new Set(candidateText.split(/\s+/));
  const clusterWords = clusterTitle.split(/\s+/);
  const overlap = clusterWords.filter((w) => candidateWords.has(w)).length;
  return overlap >= 2;
}

async function realJudge(
  candidateText: string,
  clusterTitle: string
): Promise<boolean> {
  const { default: OpenAI } = await import("openai").catch(() => {
    throw new Error('Run "npm install openai" to enable the LLM judge');
  });

  const client = new OpenAI();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 10,
    messages: [
      {
        role: "system",
        content:
          "You decide if two Korean news snippets cover the same story. Reply ONLY with 'yes' or 'no'.",
      },
      {
        role: "user",
        content: `Cluster representative: "${clusterTitle}"\nNew article: "${candidateText}"\nSame story?`,
      },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim().toLowerCase();
  return answer === "yes";
}
