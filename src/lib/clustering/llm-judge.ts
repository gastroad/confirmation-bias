// LLM judge: called only when cosine similarity falls in the ambiguous range (0.70–0.85).
// Keeps LLM cost low by restricting invocations to uncertain cases.
//
// To activate: set OPENAI_API_KEY (or ANTHROPIC_API_KEY) in .env and uncomment the real impl.

export async function llmJudge(
  candidateText: string,
  clusterTitle: string
): Promise<boolean> {
  if (process.env.NODE_ENV === "test" || !process.env.OPENAI_API_KEY) {
    return mockJudge(candidateText, clusterTitle);
  }

  return realJudge(candidateText, clusterTitle);
}

// ─── Mock (for MVP / no API key) ──────────────────────────────────────────────

function mockJudge(candidateText: string, clusterTitle: string): boolean {
  // Simple keyword overlap as a stand-in for LLM judgement
  const candidateWords = new Set(candidateText.split(/\s+/));
  const clusterWords = clusterTitle.split(/\s+/);
  const overlap = clusterWords.filter((w) => candidateWords.has(w)).length;
  return overlap >= 2;
}

// ─── Real LLM judge (activate when OPENAI_API_KEY is set) ────────────────────

async function realJudge(
  candidateText: string,
  clusterTitle: string
): Promise<boolean> {
  // Dynamic import so the build doesn't fail without the openai package installed
  // npm install openai  →  then this path activates automatically
  // @ts-expect-error — openai is an optional peer dep; install it to activate this path
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
