import { db } from "../server/db";
import { formatBucketDate, parseBucketDate } from "../server/clustering/bucket";

// RSS `pubDate`를 그대로 믿던 시절에 들어온 이상치를 지운다.
//
//   npm run cleanup:dates -- --dry-run     # 지우지 않고 대상만 센다 (권장: 먼저 이걸로 확인)
//   npm run cleanup:dates
//   npm run cleanup:dates -- --before=2026-06-01
//
// 실제로 2023-03 날짜를 달고 온 기사가 20건 섞여 있었고, 그대로 두면 `/d/2023-03-10` 같은
// URL이 생겨 색인된다. 그것만으로 품질 감점이라 지운다.
// 수집 단계는 `scripts/collect.ts`의 `MAX_PAST_DAYS`(30일)가 이미 막고 있으므로,
// 이 스크립트는 **그 방어가 생기기 전에 적재된 잔재**를 걷어내는 일회성 정리다.

/** 서비스가 수집을 시작한 달. 이보다 앞선 버킷은 전부 잘못 들어온 것이다. */
const DEFAULT_FLOOR = "2026-06-01";

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>();
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) flags.set(m[1], m[2] ?? "true");
  }
  return {
    floor: parseBucketDate(flags.get("before") ?? DEFAULT_FLOOR),
    dryRun: flags.get("dry-run") === "true",
  };
}

async function main() {
  const { floor, dryRun } = parseArgs(process.argv.slice(2));

  const [articles, clusters] = await Promise.all([
    db.article.findMany({
      where: { bucketDate: { lt: floor } },
      select: { id: true, bucketDate: true, url: true },
      orderBy: { bucketDate: "asc" },
    }),
    db.cluster.findMany({
      where: { bucketDate: { lt: floor } },
      select: { id: true, bucketDate: true, _count: { select: { comments: true } } },
      orderBy: { bucketDate: "asc" },
    }),
  ]);

  console.log(`🧹 기준일 ${formatBucketDate(floor)} 이전${dryRun ? " · DRY RUN" : ""}`);
  console.log(`   기사 ${articles.length}건 · 클러스터 ${clusters.length}개`);

  const byDate = new Map<string, number>();
  for (const a of articles) {
    const d = formatBucketDate(a.bucketDate);
    byDate.set(d, (byDate.get(d) ?? 0) + 1);
  }
  for (const [d, n] of [...byDate].sort()) console.log(`   ${d}  ${n}건`);

  // 댓글이 달린 클러스터는 지우면 Comment의 ON DELETE CASCADE가 댓글까지 가져간다.
  // 오염 날짜에 댓글이 달릴 일은 없지만, 있으면 사람이 판단해야 하므로 멈춘다.
  const withComments = clusters.filter((c) => c._count.comments > 0);
  if (withComments.length > 0) {
    console.error(
      `\n❌ 댓글이 달린 클러스터가 ${withComments.length}개 있습니다. 수동 확인이 필요합니다:`,
      withComments.map((c) => c.id)
    );
    process.exit(1);
  }

  if (articles.length === 0 && clusters.length === 0) {
    console.log("\n✅ 지울 것이 없습니다.");
    return;
  }
  if (dryRun) {
    console.log("\n⚠️  DRY RUN — DB에 쓰지 않았습니다.");
    return;
  }

  // 기사를 먼저 지운다. 클러스터를 먼저 지우면 Article.clusterId가 SET NULL로 풀리면서
  // 기사만 고아로 남는다(그 기사는 다음 배치가 다시 클러스터링해 되살린다).
  await db.$transaction(async (tx) => {
    await tx.article.deleteMany({ where: { bucketDate: { lt: floor } } });
    await tx.cluster.deleteMany({ where: { bucketDate: { lt: floor } } });
  });

  console.log("\n✅ 삭제 완료.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
