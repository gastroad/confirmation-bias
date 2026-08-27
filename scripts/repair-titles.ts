import { db } from "../server/db";
import { decodeFeedEntities } from "../server/feed-entities";

// 이미 적재된 기사 제목·발췌와 클러스터 대표 제목에 남아 있는 엔티티 잔재를 되돌린다.
//
//   npm run repair:titles -- --dry-run     # 바꾸지 않고 대상만 센다
//   npm run repair:titles
//
// `scripts/collect.ts`가 2026-08-27부터 수집 시점에 처리하므로 이건 그 전에 들어온
// 데이터를 위한 일회성 정리다. **멱등하다** — 이미 고친 문자열은 다시 바뀌지 않는다.
// → server/feed-entities.ts

const BATCH = 1000;

function parseArgs(argv: string[]) {
  return { dryRun: argv.some((a) => a === "--dry-run") };
}

async function repairArticles(dryRun: boolean) {
  let cursor: string | undefined;
  let scanned = 0;
  let changed = 0;
  const samples: string[] = [];

  for (;;) {
    const rows = await db.article.findMany({
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, description: true },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    const ids: string[] = [];
    const titles: string[] = [];
    const descriptions: string[] = [];

    for (const r of rows) {
      const title = decodeFeedEntities(r.title);
      const description = r.description ? decodeFeedEntities(r.description) : r.description;
      if (title === r.title && description === r.description) continue;
      ids.push(r.id);
      titles.push(title);
      descriptions.push(description ?? "");
      if (samples.length < 5 && title !== r.title) samples.push(`${r.title}\n      → ${title}`);
    }

    if (!dryRun && ids.length > 0) {
      await db.$executeRawUnsafe(
        `UPDATE "Article" AS a SET title = v.t, description = NULLIF(v.d, '')
         FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS t, unnest($3::text[]) AS d) v
         WHERE a.id = v.id`,
        ids,
        titles,
        descriptions
      );
    }
    changed += ids.length;
  }

  return { scanned, changed, samples };
}

async function repairClusters(dryRun: boolean) {
  let cursor: string | undefined;
  let changed = 0;

  for (;;) {
    const rows = await db.cluster.findMany({
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, representativeTitle: true },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    const ids: string[] = [];
    const titles: string[] = [];
    for (const r of rows) {
      const title = decodeFeedEntities(r.representativeTitle);
      if (title === r.representativeTitle) continue;
      ids.push(r.id);
      titles.push(title);
    }

    if (!dryRun && ids.length > 0) {
      await db.$executeRawUnsafe(
        `UPDATE "Cluster" AS c SET "representativeTitle" = v.t
         FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS t) v
         WHERE c.id = v.id`,
        ids,
        titles
      );
    }
    changed += ids.length;
  }

  return changed;
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  console.log(`🔧 엔티티 잔재 복원${dryRun ? " · DRY RUN" : ""}`);

  const articles = await repairArticles(dryRun);
  const clusters = await repairClusters(dryRun);

  console.log(
    `\n기사    ${articles.changed.toLocaleString()} / ${articles.scanned.toLocaleString()}건`
  );
  console.log(`클러스터 대표 제목 ${clusters.toLocaleString()}개`);

  if (articles.samples.length > 0) {
    console.log("\n표본:");
    for (const s of articles.samples) console.log(`  · ${s}`);
  }

  console.log(dryRun ? "\n⚠️  DRY RUN — DB에 쓰지 않았습니다." : "\n✅ 복원 완료.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
