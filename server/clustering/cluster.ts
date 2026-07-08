import { db } from "../db";
import { cosineSimilarity, updateCentroid } from "./similarity";
import { generateEmbedding } from "./embed";
import { llmJudge } from "./llm-judge";
import type { IngestInput } from "./types";

const ASSIGN_THRESHOLD = 0.85;
const JUDGE_THRESHOLD = 0.7;
const WINDOW_HOURS = 48;

export type IngestResult =
  | { action: "assigned"; clusterId: string; score: number }
  | { action: "judge_assigned"; clusterId: string; score: number }
  | { action: "judge_rejected"; clusterId: string; score: number }
  | { action: "new_cluster"; clusterId: string; score: number };

// 최근 클러스터의 centroid를 메모리로 들고 도는 인덱스 항목.
// centroid(≈10KB/건)를 기사마다 재조회하던 것을 run당 1회 로드로 바꾸기 위함.
export interface RecentCluster {
  id: string;
  representativeTitle: string;
  centroid: number[];
  count: number; // 현재 소속 기사 수 (이번 기사 반영 전)
}

// run 시작 시 1회만 호출. WINDOW 내 클러스터 centroid를 전부 메모리로 가져온다.
// 이후 ingestArticle이 이 배열을 읽고(유사도) 직접 갱신(배정·신규)한다.
export async function loadRecentClusters(): Promise<RecentCluster[]> {
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
  const rows = await db.cluster.findMany({
    where: { updatedAt: { gte: since }, centroidJson: { not: null } },
    select: {
      id: true,
      representativeTitle: true,
      centroidJson: true,
      _count: { select: { articles: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    representativeTitle: c.representativeTitle,
    centroid: JSON.parse(c.centroidJson!) as number[],
    count: c._count.articles,
  }));
}

export async function ingestArticle(
  input: IngestInput,
  recent: RecentCluster[]
): Promise<IngestResult> {
  const text = [input.title, input.description].filter(Boolean).join(" ");
  const embedding = await generateEmbedding(text);

  let best: RecentCluster | null = null;
  let bestScore = 0;

  for (const c of recent) {
    const score = cosineSimilarity(embedding, c.centroid);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  let target: RecentCluster;
  let result: IngestResult;

  if (bestScore >= ASSIGN_THRESHOLD && best) {
    target = best;
    result = { action: "assigned", clusterId: best.id, score: bestScore };
  } else if (bestScore >= JUDGE_THRESHOLD && best) {
    const sameStory = await llmJudge(text, best.representativeTitle);
    if (sameStory) {
      target = best;
      result = { action: "judge_assigned", clusterId: best.id, score: bestScore };
    } else {
      target = await createCluster(input.title, embedding, recent);
      result = { action: "judge_rejected", clusterId: target.id, score: bestScore };
    }
  } else {
    target = await createCluster(input.title, embedding, recent);
    result = { action: "new_cluster", clusterId: target.id, score: bestScore };
  }

  // select로 응답 컬럼을 좁혀 embeddingJson(≈10KB)이 되돌아오는 egress를 막는다.
  const created = await db.article.upsert({
    where: { url: input.url },
    update: {},
    create: {
      title: input.title,
      description: input.description,
      url: input.url,
      publishedAt: new Date(input.publishedAt),
      outletId: input.outletId,
      clusterId: target.id,
      embeddingJson: JSON.stringify(embedding),
    },
    select: { clusterId: true },
  });
  // upsert가 기존 기사(중복 URL)를 만나 이 클러스터에 넣지 못했으면 centroid는 그대로 둔다.
  if (created.clusterId !== target.id) return result;

  const updated = updateCentroid(target.centroid, embedding, target.count);
  target.centroid = updated;
  target.count += 1;

  await db.cluster.update({
    where: { id: target.id },
    data: { centroidJson: JSON.stringify(updated) },
    select: { id: true },
  });

  return result;
}

// 새 클러스터를 DB에 만들고 메모리 인덱스에도 즉시 추가한다.
// centroid는 첫 기사 임베딩으로 두고 count=0에서 시작 → 직후 updateCentroid가
// 정규화된 centroid로 맞춘다(기존 refreshCentroid 동작 보존).
async function createCluster(
  representativeTitle: string,
  embedding: number[],
  recent: RecentCluster[]
): Promise<RecentCluster> {
  const cluster = await db.cluster.create({
    data: { representativeTitle, centroidJson: JSON.stringify(embedding) },
    select: { id: true },
  });
  const mem: RecentCluster = {
    id: cluster.id,
    representativeTitle,
    centroid: embedding,
    count: 0,
  };
  recent.push(mem);
  return mem;
}
