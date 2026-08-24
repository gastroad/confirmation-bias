// ⚠️ 현재 파이프라인에서 쓰이지 않는다.
//
// 증분 배정 시절 0.70~0.85 경계 구간을 판정하던 함수다. 일별 배치 HAC는 그날 기사 전체를
// 보고 나누므로 경계 판정의 필요가 크게 줄어 일단 뺐다. 재도입한다면 병합 경계 쌍 상위
// K개에만 적용하는 형태가 될 것이다(전수 적용은 호출 수가 폭발한다).
// → docs/agent/daily-clustering.md

export async function llmJudge(candidateText: string, clusterTitle: string): Promise<boolean> {
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

async function realJudge(candidateText: string, clusterTitle: string): Promise<boolean> {
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
