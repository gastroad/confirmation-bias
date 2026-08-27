import { db } from "../server/db";
import { buildClusterSummary } from "../server/clustering/summary";

// 기존 클러스터에 요약 문장을 채운다.
//
//   npm run backfill:summary -- --dry-run          # 쓰지 않고 표본만 출력
//   npm run backfill:summary                       # 전체 재생성
//   npm run backfill:summary -- --missing-only     # summary가 비어 있는 것만
//
// ⚠️ **`npm run cluster:day -- --all`로 백필하지 않는다.** clusterDay는 그 날짜의 클러스터를
// 지우고 **새 id로 재생성**하므로, 1만여 개 URL이 전부 바뀌어 이미 색인된 URL이 전량 404가
// 된다. 심사 기간 중 대량 404는 최악의 신호다. 이 스크립트는 클러스터를 건드리지 않고
// `summary`만 UPDATE한다. → docs/agent/adsense-compliance.md

/** 한 번에 읽어 올 클러스터 수. 기사까지 include하므로 너무 키우면 메모리·egress가 튄다. */
const BATCH = 500;

function parseArgs(argv: string[]) {
  const flags = new Set(
    argv.map((a) => /^--([^=]+)/.exec(a)?.[1]).filter((f): f is string => Boolean(f))
  );
  return { dryRun: flags.has("dry-run"), missingOnly: flags.has("missing-only") };
}

async function main() {
  const { dryRun, missingOnly } = parseArgs(process.argv.slice(2));

  const outlets = await db.outlet.findMany({ select: { id: true, name: true, leaning: true } });
  const where = missingOnly ? { summary: null } : {};

  const total = await db.cluster.count({ where });
  console.log(
    `📝 대상 클러스터 ${total.toLocaleString()}개${missingOnly ? " (summary 비어 있는 것만)" : ""}${dryRun ? " · DRY RUN" : ""}`
  );

  let cursor: string | undefined;
  let processed = 0;
  let written = 0;
  const samples: string[] = [];

  for (;;) {
    const batch = await db.cluster.findMany({
      where,
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        articles: { select: { outletId: true, publishedAt: true } },
      },
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;
    processed += batch.length;

    const ids: string[] = [];
    const texts: string[] = [];
    for (const c of batch) {
      const summary = buildClusterSummary(c.articles, outlets);
      if (!summary) continue;
      ids.push(c.id);
      texts.push(summary);
      if (samples.length < 5) samples.push(summary);
    }

    if (!dryRun && ids.length > 0) {
      await db.$executeRawUnsafe(
        `UPDATE "Cluster" AS c SET summary = v.s
         FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS s) v
         WHERE c.id = v.id`,
        ids,
        texts
      );
    }
    written += ids.length;

    process.stdout.write(`\r   ${processed.toLocaleString()} / ${total.toLocaleString()}`);
  }

  console.log(`\n\n표본:`);
  for (const s of samples) console.log(`  · ${s}`);

  console.log(
    `\n${dryRun ? "⚠️  DRY RUN — " : "✅ "}${written.toLocaleString()}개 클러스터에 요약을 ${dryRun ? "만들었습니다(쓰지 않음)" : "썼습니다"}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
