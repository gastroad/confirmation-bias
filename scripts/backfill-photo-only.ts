import { db } from "../server/db";
import { isPhotoCaption } from "../server/clustering/representative";

// 기존 클러스터의 `photoOnly`(기사 전부가 사진 캡션인가)를 채운다. 멱등이다.
//
//   npm run backfill:photo-only -- --dry-run     # 쓰지 않고 바뀔 수만 출력
//   npm run backfill:photo-only
//
// ⚠️ **`npm run cluster:day -- --all`로 반영하지 않는다.** clusterDay는 클러스터를 **새 id로
// 재생성**하므로 색인된 URL이 전량 404가 된다. 이 스크립트는 `photoOnly`만 UPDATE한다.
//
// 이 값이 참이 되면 색인 기준을 넘던 클러스터도 404가 된다(댓글이 달린 것은 남는다) →
// `entities/cluster`의 `isIndexableCluster`. 캡션 판정을 고친 뒤에도 이걸 다시 돌린다.

function parseArgs(argv: string[]) {
  return { dryRun: argv.includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const clusters = await db.cluster.findMany({
    select: {
      id: true,
      representativeTitle: true,
      photoOnly: true,
      articles: { select: { title: true } },
    },
  });

  const toTrue: string[] = [];
  const toFalse: string[] = [];
  const samples: string[] = [];
  for (const c of clusters) {
    const photoOnly = c.articles.length > 0 && c.articles.every((a) => isPhotoCaption(a.title));
    if (photoOnly === c.photoOnly) continue;
    (photoOnly ? toTrue : toFalse).push(c.id);
    if (photoOnly && c.articles.length >= 3 && samples.length < 10) {
      samples.push(`${c.representativeTitle} (${c.articles.length}건)`);
    }
  }
  const total = clusters.filter((c) => c.photoOnly).length + toTrue.length - toFalse.length;

  console.log(
    `📷 사진만으로 된 클러스터 ${total.toLocaleString()}개 / 전체 ${clusters.length.toLocaleString()}개 — 바꿀 것: 참 ${toTrue.length.toLocaleString()} · 거짓 ${toFalse.length.toLocaleString()}${dryRun ? " · DRY RUN" : ""}`
  );
  console.log(`\n표본(3건 이상):`);
  for (const s of samples) console.log(`  · ${s}`);

  if (!dryRun) {
    await db.cluster.updateMany({ where: { id: { in: toTrue } }, data: { photoOnly: true } });
    await db.cluster.updateMany({ where: { id: { in: toFalse } }, data: { photoOnly: false } });
  }
  console.log(`\n${dryRun ? "⚠️  DRY RUN — 쓰지 않았습니다" : "✅ 반영했습니다"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
