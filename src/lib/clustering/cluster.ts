import { db } from "@/lib/db";
import { cosineSimilarity, updateCentroid } from "./similarity";
import { generateEmbedding } from "./embed";
import { llmJudge } from "./llm-judge";
import type { IngestInput } from "@/types";

const ASSIGN_THRESHOLD = 0.85;  // direct match
const JUDGE_THRESHOLD  = 0.70;  // ambiguous → LLM judge
const WINDOW_HOURS     = 48;    // only compare against recent clusters

export type IngestResult =
  | { action: "assigned"; clusterId: string; score: number }
  | { action: "judge_assigned"; clusterId: string; score: number }
  | { action: "judge_rejected"; clusterId: string; score: number }
  | { action: "new_cluster"; clusterId: string; score: number };

export async function ingestArticle(input: IngestInput): Promise<IngestResult> {
  const text = [input.title, input.description].filter(Boolean).join(" ");
  const embedding = await generateEmbedding(text);

  // Compare against cluster centroids within the recency window
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
  const recentClusters = await db.cluster.findMany({
    where: { updatedAt: { gte: since }, centroidJson: { not: null } },
    select: { id: true, representativeTitle: true, centroidJson: true },
  });

  let bestClusterId: string | null = null;
  let bestTitle = "";
  let bestScore = 0;

  for (const c of recentClusters) {
    const centroid = JSON.parse(c.centroidJson!) as number[];
    const score = cosineSimilarity(embedding, centroid);
    if (score > bestScore) {
      bestScore = score;
      bestClusterId = c.id;
      bestTitle = c.representativeTitle;
    }
  }

  let result: IngestResult;

  if (bestScore >= ASSIGN_THRESHOLD && bestClusterId) {
    result = { action: "assigned", clusterId: bestClusterId, score: bestScore };
  } else if (bestScore >= JUDGE_THRESHOLD && bestClusterId) {
    const sameStory = await llmJudge(text, bestTitle);
    result = sameStory
      ? { action: "judge_assigned", clusterId: bestClusterId, score: bestScore }
      : { action: "judge_rejected", clusterId: await createCluster(input.title, embedding), score: bestScore };
  } else {
    result = { action: "new_cluster", clusterId: await createCluster(input.title, embedding), score: bestScore };
  }

  // Persist article
  await db.article.create({
    data: {
      title:         input.title,
      description:   input.description,
      url:           input.url,
      publishedAt:   new Date(input.publishedAt),
      outletId:      input.outletId,
      clusterId:     result.clusterId,
      embeddingJson: JSON.stringify(embedding),
    },
  });

  // Update centroid of the (possibly new) cluster
  await refreshCentroid(result.clusterId, embedding);

  return result;
}

async function createCluster(representativeTitle: string, embedding: number[]): Promise<string> {
  const cluster = await db.cluster.create({
    data: { representativeTitle, centroidJson: JSON.stringify(embedding) },
  });
  return cluster.id;
}

async function refreshCentroid(clusterId: string, newEmbedding: number[]) {
  const cluster = await db.cluster.findUnique({
    where: { id: clusterId },
    include: { _count: { select: { articles: true } } },
  });
  if (!cluster?.centroidJson) return;

  const count = cluster._count.articles;
  const centroid = JSON.parse(cluster.centroidJson) as number[];
  const updated = updateCentroid(centroid, newEmbedding, count - 1); // count already includes new article

  await db.cluster.update({
    where: { id: clusterId },
    data: { centroidJson: JSON.stringify(updated) },
  });
}
