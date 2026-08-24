import { db } from "../db";

export interface BlockResult {
  url: string;
  /** 함께 삭제된 기존 기사 수 (0이면 아직 수집되지 않은 URL) */
  removedArticles: number;
}

/**
 * 기사 하나를 차단한다.
 *
 * **차단 목록 등록과 기존 기사 삭제를 한 트랜잭션으로 묶는다.** 목록에만 넣으면 이미 저장된
 * 기사가 계속 보이고, 지우기만 하면 3시간 뒤 RSS에서 재수집된다(collect는 url 중복만 막는다).
 * 둘 다 해야 "지체 없이 제외한다"는 약관을 지킬 수 있다.
 *
 * 아직 수집되지 않은 URL도 미리 등록할 수 있다(사전 차단).
 */
export async function blockUrl(input: {
  url: string;
  reason?: string | null;
  blockedBy?: string | null;
}): Promise<BlockResult> {
  const url = input.url.trim();

  return db.$transaction(async (tx) => {
    await tx.blockedUrl.upsert({
      where: { url },
      update: { reason: input.reason ?? null, blockedBy: input.blockedBy ?? null },
      create: { url, reason: input.reason ?? null, blockedBy: input.blockedBy ?? null },
    });

    // 소속 클러스터의 articleCount가 어긋나지만, 다음 클러스터링이 그 날짜를 다시 계산한다.
    // 과거 날짜는 재계산되지 않으므로 카운트만 맞춰 둔다.
    const target = await tx.article.findUnique({
      where: { url },
      select: { id: true, clusterId: true },
    });
    if (!target) return { url, removedArticles: 0 };

    await tx.article.delete({ where: { id: target.id } });
    if (target.clusterId) {
      await tx.cluster.update({
        where: { id: target.clusterId },
        data: { articleCount: { decrement: 1 } },
      });
    }
    return { url, removedArticles: 1 };
  });
}

export async function unblockUrl(url: string): Promise<number> {
  const { count } = await db.blockedUrl.deleteMany({ where: { url } });
  return count;
}

export async function findBlockedUrls(limit = 100) {
  return db.blockedUrl.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { url: true, reason: true, createdAt: true },
  });
}

/** collect가 매 수집마다 부른다. 목록이 커지면 Set으로 들고 도는 편이 싸다. */
export async function findBlockedUrlSet(): Promise<Set<string>> {
  const rows = await db.blockedUrl.findMany({ select: { url: true } });
  return new Set(rows.map((r) => r.url));
}

export async function countBlockedUrls(): Promise<number> {
  return db.blockedUrl.count();
}
