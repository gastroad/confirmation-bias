import { db } from "../server/db";
import { decodeEmbedding, normalizeInPlace } from "../server/clustering/vector";
import { isPhotoCaption, representativeIndex } from "../server/clustering/representative";

// 대표 제목이 사진 캡션인 클러스터의 제목만 다시 고른다.
//
//   npm run backfill:titles -- --dry-run     # 쓰지 않고 바뀔 제목만 출력
//   npm run backfill:titles
//
// ⚠️ **`npm run cluster:day -- --all`로 반영하지 않는다.** clusterDay는 클러스터를 **새 id로
// 재생성**하므로 색인된 URL이 전량 404가 된다. 이 스크립트는 id·기사 배정을 건드리지 않고
// `representativeTitle`만 UPDATE한다(`backfill-summary.ts`와 같은 이유).
//
// 대상을 캡션 제목으로 좁혀도 결과가 전체 재계산과 같다 — 지금 제목이 캡션이 아니면 그게 이미
// centroid 최근접이고, 캡션을 빼는 규칙은 그 답을 바꾸지 않는다.

/** 한 번에 기사(임베딩 2KB씩)를 읽어 올 클러스터 수. */
const BATCH = 100;

function parseArgs(argv: string[]) {
  return { dryRun: argv.includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const all = await db.cluster.findMany({ select: { id: true, representativeTitle: true } });
  const targets = all.filter((c) => isPhotoCaption(c.representativeTitle)).map((c) => c.id);
  console.log(
    `📝 대표 제목이 사진 캡션인 클러스터 ${targets.length.toLocaleString()}개 / 전체 ${all.length.toLocaleString()}개${dryRun ? " · DRY RUN" : ""}`
  );

  let written = 0;
  let unchanged = 0;
  const samples: string[] = [];

  for (let start = 0; start < targets.length; start += BATCH) {
    const batch = await db.cluster.findMany({
      where: { id: { in: targets.slice(start, start + BATCH) } },
      select: {
        id: true,
        representativeTitle: true,
        // clusterDay가 기사를 읽는 순서와 같게 둔다(동률일 때 앞선 기사가 이긴다).
        articles: { orderBy: { publishedAt: "asc" }, select: { title: true, embedding: true } },
      },
    });

    const ids: string[] = [];
    const titles: string[] = [];
    for (const c of batch) {
      const arts = c.articles.filter((a) => a.embedding !== null);
      if (arts.length === 0) continue;
      const vectors = arts.map((a) => normalizeInPlace(decodeEmbedding(a.embedding!)));
      const articleTitles = arts.map((a) => a.title);
      const next =
        articleTitles[
          representativeIndex(
            vectors,
            articleTitles,
            arts.map((_, i) => i)
          )
        ];

      if (next === c.representativeTitle) {
        unchanged++;
        continue;
      }
      ids.push(c.id);
      titles.push(next);
      if (samples.length < 10) samples.push(`${c.representativeTitle}\n    → ${next}`);
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
    written += ids.length;
    process.stdout.write(
      `\r   ${Math.min(start + BATCH, targets.length).toLocaleString()} / ${targets.length.toLocaleString()}`
    );
  }

  console.log(`\n\n표본:`);
  for (const s of samples) console.log(`  · ${s}`);

  console.log(
    `\n${dryRun ? "⚠️  DRY RUN — " : "✅ "}${written.toLocaleString()}개 제목을 ${dryRun ? "바꿀 예정입니다(쓰지 않음)" : "바꿨습니다"}. 기사 전부가 캡션이라 그대로 둔 것 ${unchanged.toLocaleString()}개.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
