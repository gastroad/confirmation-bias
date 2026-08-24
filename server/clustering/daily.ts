import { randomUUID } from "node:crypto";
import { db } from "../db";
import { agglomerate } from "./hac";
import { generateEmbeddings } from "./embed";
import { dot } from "./similarity";
import { centroidOf, decodeEmbedding, encodeEmbedding, normalizeInPlace } from "./vector";
import { bucketRange, formatBucketDate } from "./bucket";

/**
 * 코사인 유사도 임계값. 세 날짜(2026-08-20 662건 / 08-17 403건 / 07-15 518건)를
 * 0.54~0.70 구간에서 실측해 고른 값이다.
 * - 0.65 이상: 하나여야 할 대형 이슈(전당대회 등)가 둘로 쪼개진다
 * - 0.60 이하: 최대 클러스터가 67 → 86 → 138건으로 급증한다
 * 무작위 쌍 유사도가 p50 0.34 / p99 0.66이라 0.62는 상위 1% 근처에 놓인다.
 */
export const DEFAULT_THRESHOLD = 0.62;

export interface ClusterDayOptions {
  threshold?: number;
  /** true면 DB에 쓰지 않고 통계만 낸다(임계값 튜닝용). */
  dryRun?: boolean;
}

export interface ClusterDayResult {
  bucketDate: string;
  articles: number;
  clusters: number;
  largest: number;
  singletons: number;
  embedded: number;
}

interface Loaded {
  ids: string[];
  titles: string[];
  vectors: Float32Array[];
}

/** 임베딩이 없는 기사는 여기서 채운다. collect는 임베딩을 만들지 않는다. */
async function loadDay(bucket: Date, dryRun: boolean): Promise<Loaded & { embedded: number }> {
  const { start, end } = bucketRange(bucket);
  const rows = await db.article.findMany({
    where: { publishedAt: { gte: start, lt: end } },
    select: { id: true, title: true, description: true, embedding: true },
    orderBy: { publishedAt: "asc" },
  });

  const missing = rows.filter((r) => r.embedding === null);
  const fresh = new Map<string, number[]>();

  if (missing.length > 0 && !dryRun) {
    const texts = missing.map((r) => [r.title, r.description].filter(Boolean).join(" "));
    const embeddings = await generateEmbeddings(texts);
    missing.forEach((r, i) => fresh.set(r.id, embeddings[i]));

    await db.$executeRawUnsafe(
      `UPDATE "Article" AS a SET embedding = v.emb
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::bytea[]) AS emb) v
       WHERE a.id = v.id`,
      missing.map((r) => r.id),
      missing.map((r) => Buffer.from(encodeEmbedding(fresh.get(r.id)!)))
    );
  }

  const ids: string[] = [];
  const titles: string[] = [];
  const vectors: Float32Array[] = [];

  for (const r of rows) {
    const raw = r.embedding
      ? decodeEmbedding(r.embedding)
      : fresh.has(r.id)
        ? Float32Array.from(fresh.get(r.id)!)
        : null;
    if (!raw) continue; // dry-run에서 임베딩이 없는 기사는 제외

    ids.push(r.id);
    titles.push(r.title);
    // 512차원으로 자르면서 생긴 노름 오차(0.99933~1.00058)를 여기서 흡수한다.
    // 이후 hac은 유사도를 내적으로만 계산한다.
    vectors.push(normalizeInPlace(raw));
  }

  return { ids, titles, vectors, embedded: dryRun ? 0 : missing.length };
}

/** 그룹 centroid에 가장 가까운 기사의 제목. LLM 호출 없이 대표성을 얻는다. */
function representativeIndex(vectors: readonly Float32Array[], group: readonly number[]): number {
  if (group.length === 1) return group[0];
  const centroid = centroidOf(vectors, group);
  return group.reduce(
    (best, i) => (dot(vectors[i], centroid) > dot(vectors[best], centroid) ? i : best),
    group[0]
  );
}

/**
 * KST 하루치를 통째로 다시 클러스터링한다.
 *
 * **멱등하다** — 해당 버킷의 기존 클러스터를 지우고 새로 만들기 때문에 같은 날짜를
 * 몇 번 돌려도 결과가 같다. 증분 배정과 달리 기사 도착 순서에 영향받지 않는다.
 */
export async function clusterDay(
  bucket: Date,
  { threshold = DEFAULT_THRESHOLD, dryRun = false }: ClusterDayOptions = {}
): Promise<ClusterDayResult> {
  const bucketDate = formatBucketDate(bucket);
  const { ids, titles, vectors, embedded } = await loadDay(bucket, dryRun);

  if (vectors.length === 0) {
    return { bucketDate, articles: 0, clusters: 0, largest: 0, singletons: 0, embedded };
  }

  const groups = agglomerate(vectors, { threshold }).sort((a, b) => b.length - a.length);
  const sizes = groups.map((g) => g.length);
  const result: ClusterDayResult = {
    bucketDate,
    articles: vectors.length,
    clusters: groups.length,
    largest: sizes[0] ?? 0,
    singletons: sizes.filter((s) => s === 1).length,
    embedded,
  };

  if (dryRun) return result;

  // 클러스터 id를 앱에서 만들어 두면 생성과 배정을 각각 쿼리 1회로 끝낼 수 있다.
  // 그룹마다 create → update를 왕복하면 250그룹에 500왕복이라 트랜잭션이 타임아웃난다.
  const clusterIds = groups.map(() => randomUUID());
  const articleIds: string[] = [];
  const assignedClusterIds: string[] = [];
  groups.forEach((group, gi) => {
    for (const i of group) {
      articleIds.push(ids[i]);
      assignedClusterIds.push(clusterIds[gi]);
    }
  });

  await db.$transaction(async (tx) => {
    // 재실행 시 이전 결과를 걷어낸다. 먼저 참조를 끊어야 클러스터를 지울 수 있다.
    await tx.article.updateMany({
      where: { id: { in: ids } },
      data: { clusterId: null },
    });
    await tx.cluster.deleteMany({ where: { bucketDate: bucket } });

    await tx.cluster.createMany({
      data: groups.map((group, gi) => ({
        id: clusterIds[gi],
        bucketDate: bucket,
        representativeTitle: titles[representativeIndex(vectors, group)],
        articleCount: group.length,
      })),
    });

    await tx.$executeRawUnsafe(
      `UPDATE "Article" AS a SET "clusterId" = v.cid
       FROM (SELECT unnest($1::text[]) AS aid, unnest($2::text[]) AS cid) v
       WHERE a.id = v.aid`,
      articleIds,
      assignedClusterIds
    );
  });

  return result;
}
