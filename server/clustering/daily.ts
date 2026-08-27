import { randomUUID } from "node:crypto";
import { db } from "../db";
import { agglomerate } from "./hac";
import { generateEmbeddings } from "./embed";
import { dot } from "./similarity";
import { centroidOf, decodeEmbedding, encodeEmbedding, normalizeInPlace } from "./vector";
import { bucketRange, formatBucketDate } from "./bucket";
import { buildClusterSummary } from "./summary";

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
  /** `ids`와 같은 인덱스. 요약 문장(진영별 보도·침묵·시차)이 쓴다. */
  outletIds: string[];
  /** `ids`와 같은 인덱스. */
  publishedAt: Date[];
  /** 재클러스터링 전 배정. 댓글 승계에 쓴다. */
  previousClusterByArticle: Map<string, string>;
}

/** 임베딩이 없는 기사는 여기서 채운다. collect는 임베딩을 만들지 않는다. */
async function loadDay(bucket: Date, dryRun: boolean): Promise<Loaded & { embedded: number }> {
  const { start, end } = bucketRange(bucket);
  const rows = await db.article.findMany({
    where: { publishedAt: { gte: start, lt: end } },
    select: {
      id: true,
      title: true,
      description: true,
      embedding: true,
      clusterId: true,
      outletId: true,
      publishedAt: true,
    },
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
  const outletIds: string[] = [];
  const publishedAt: Date[] = [];
  const previousClusterByArticle = new Map<string, string>();

  for (const r of rows) {
    const raw = r.embedding
      ? decodeEmbedding(r.embedding)
      : fresh.has(r.id)
        ? Float32Array.from(fresh.get(r.id)!)
        : null;
    if (!raw) continue; // dry-run에서 임베딩이 없는 기사는 제외

    ids.push(r.id);
    titles.push(r.title);
    outletIds.push(r.outletId);
    publishedAt.push(r.publishedAt);
    if (r.clusterId) previousClusterByArticle.set(r.id, r.clusterId);
    // 512차원으로 자르면서 생긴 노름 오차(0.99933~1.00058)를 여기서 흡수한다.
    // 이후 hac은 유사도를 내적으로만 계산한다.
    vectors.push(normalizeInPlace(raw));
  }

  return {
    ids,
    titles,
    vectors,
    outletIds,
    publishedAt,
    previousClusterByArticle,
    embedded: dryRun ? 0 : missing.length,
  };
}

/**
 * 옛 클러스터 → 새 클러스터 승계 매핑.
 *
 * 평상시에는 쓰이지 않는다 — 클러스터링은 하루 1회 전날에 대해서만 돌아 한번 만들어진 날짜는
 * 고정된다. **관리자 재실행이나 백필로 같은 날짜를 다시 돌릴 때** 클러스터가 새 id로 재생성되며,
 * 그때 댓글이 유실되지 않도록 옛 클러스터에 속했던 기사들이 **어느 새 클러스터로 가장 많이
 * 갔는지**로 후계자를 정한다.
 * 동수면 새 클러스터 id가 작은 쪽(결정적).
 */
export function successorByOldCluster(
  previousClusterByArticle: Map<string, string>,
  ids: readonly string[],
  groups: readonly (readonly number[])[],
  clusterIds: readonly string[]
): Map<string, string> {
  // oldClusterId -> newClusterId -> 물려받은 기사 수
  const tally = new Map<string, Map<string, number>>();

  groups.forEach((group, gi) => {
    for (const i of group) {
      const oldId = previousClusterByArticle.get(ids[i]);
      if (!oldId) continue;
      const perOld = tally.get(oldId) ?? new Map<string, number>();
      perOld.set(clusterIds[gi], (perOld.get(clusterIds[gi]) ?? 0) + 1);
      tally.set(oldId, perOld);
    }
  });

  const successor = new Map<string, string>();
  for (const [oldId, perOld] of tally) {
    let bestId = "";
    let bestCount = -1;
    for (const [newId, count] of perOld) {
      if (count > bestCount || (count === bestCount && newId < bestId)) {
        bestCount = count;
        bestId = newId;
      }
    }
    successor.set(oldId, bestId);
  }
  return successor;
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
  const { ids, titles, vectors, outletIds, publishedAt, previousClusterByArticle, embedded } =
    await loadDay(bucket, dryRun);

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

  const successor = successorByOldCluster(previousClusterByArticle, ids, groups, clusterIds);

  // 침묵한 진영을 말하려면 **보도하지 않은 매체까지 포함한 전체 명단**이 필요하다.
  const outlets = await db.outlet.findMany({ select: { id: true, name: true, leaning: true } });
  const summaries = groups.map((group) =>
    buildClusterSummary(
      group.map((i) => ({ outletId: outletIds[i], publishedAt: publishedAt[i] })),
      outlets
    )
  );

  // **삭제를 마지막에 한다.** 옛 클러스터를 먼저 지우면 Comment의 ON DELETE CASCADE가
  // 댓글까지 가져가 버린다(재실행 시에만 해당). 새 클러스터를 만들고 댓글을 옮긴 뒤에 지운다.
  await db.$transaction(async (tx) => {
    const staleClusterIds = (
      await tx.cluster.findMany({ where: { bucketDate: bucket }, select: { id: true } })
    ).map((c) => c.id);

    await tx.cluster.createMany({
      data: groups.map((group, gi) => ({
        id: clusterIds[gi],
        bucketDate: bucket,
        representativeTitle: titles[representativeIndex(vectors, group)],
        articleCount: group.length,
        summary: summaries[gi],
      })),
    });

    await tx.$executeRawUnsafe(
      `UPDATE "Article" AS a SET "clusterId" = v.cid
       FROM (SELECT unnest($1::text[]) AS aid, unnest($2::text[]) AS cid) v
       WHERE a.id = v.aid`,
      articleIds,
      assignedClusterIds
    );

    if (successor.size > 0) {
      await tx.$executeRawUnsafe(
        `UPDATE "Comment" AS c SET "clusterId" = v.new_id
         FROM (SELECT unnest($1::text[]) AS old_id, unnest($2::text[]) AS new_id) v
         WHERE c."clusterId" = v.old_id`,
        [...successor.keys()],
        [...successor.values()]
      );
    }

    if (staleClusterIds.length > 0) {
      await tx.cluster.deleteMany({ where: { id: { in: staleClusterIds } } });
    }
  });

  return result;
}
