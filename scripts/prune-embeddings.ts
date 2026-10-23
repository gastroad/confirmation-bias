import { db } from "../server/db";
import { formatBucketDate } from "../server/clustering/bucket";
import { EMBEDDING_RETENTION_DAYS, embeddingCutoff } from "../server/clustering/retention";

// 보존 기간(EMBEDDING_RETENTION_DAYS)보다 오래된 날짜의 `Article.embedding`을 NULL로 비운다.
// 멱등이다 — 이미 비운 행은 다시 건드리지 않는다.
//
//   npm run prune:embeddings                         # 기본이 DRY RUN. 대상 수와 회수 추정만 출력
//   npm run prune:embeddings -- --apply              # 실제로 비운다
//   npm run prune:embeddings -- --apply --max-rows=5000
//                                                    # 대상이 5,000행을 넘으면 쓰지 않고 실패(cron용)
//
// 다른 백필과 달리 **쓰기가 기본값이 아니다.** 되돌리려면 재임베딩(OpenAI 호출)이 필요하다.
//
// ⚠️ NULL로 비워도 디스크는 반납되지 않는다. autovacuum이 빈 TOAST 공간을 재사용 가능으로 표시해
// **더 커지지 않게** 할 뿐이다. 실제로 줄이려면 사람이 시각을 골라 `VACUUM FULL`을 한 번 돌린다
// → docs/agent/infrastructure.md의 "임베딩 보존 기간". 이 스크립트는 VACUUM을 하지 않는다.

/** 한 UPDATE가 비우는 행 수. 한 트랜잭션에 5만 행을 몰면 WAL·dead tuple이 한꺼번에 쌓인다. */
const BATCH = 2000;

interface Args {
  apply: boolean;
  maxRows: number | null;
}

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string>();
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) flags.set(m[1], m[2] ?? "true");
  }
  let maxRows: number | null = null;
  if (flags.has("max-rows")) {
    maxRows = Number(flags.get("max-rows"));
    if (!Number.isInteger(maxRows) || maxRows < 0) {
      throw new Error(`--max-rows는 0 이상의 정수여야 합니다: ${flags.get("max-rows")}`);
    }
  }
  return { apply: flags.get("apply") === "true", maxRows };
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

async function main() {
  const { apply, maxRows } = parseArgs(process.argv.slice(2));
  const cutoff = formatBucketDate(embeddingCutoff(new Date()));

  const [stats] = await db.$queryRawUnsafe<
    {
      candidates: bigint;
      with_embedding: bigint;
      oldest: Date | null;
      newest: Date | null;
      db_bytes: bigint;
      toast_bytes: bigint;
    }[]
  >(
    `SELECT
       count(*) FILTER (WHERE "bucketDate" < $1::date AND embedding IS NOT NULL) AS candidates,
       count(embedding) AS with_embedding,
       min("bucketDate") FILTER (WHERE "bucketDate" < $1::date AND embedding IS NOT NULL) AS oldest,
       max("bucketDate") FILTER (WHERE "bucketDate" < $1::date AND embedding IS NOT NULL) AS newest,
       pg_database_size(current_database()) AS db_bytes,
       pg_total_relation_size((SELECT reltoastrelid FROM pg_class WHERE relname = 'Article')) AS toast_bytes
     FROM "Article"`,
    cutoff
  );
  const candidates = Number(stats.candidates);
  const withEmbedding = Number(stats.with_embedding);
  const toastBytes = Number(stats.toast_bytes);
  // TOAST는 임베딩만 담는다. 청크 오버헤드까지 행 수에 비례해 나눈다.
  const reclaimable = withEmbedding > 0 ? (toastBytes * candidates) / withEmbedding : 0;

  console.log(
    `🧹 임베딩 보존 기간 ${EMBEDDING_RETENTION_DAYS}일 — ${cutoff} 이전(KST) 날짜를 비운다${apply ? "" : " · DRY RUN"}`
  );
  console.log(
    `   대상 ${candidates.toLocaleString()}행 / 임베딩 보유 ${withEmbedding.toLocaleString()}행` +
      (stats.oldest && stats.newest
        ? ` (${formatBucketDate(stats.oldest)} ~ ${formatBucketDate(stats.newest)})`
        : "")
  );
  console.log(
    `   DB ${mb(Number(stats.db_bytes))} (pg_database_size) · Article TOAST ${mb(toastBytes)} → 재사용 가능해질 공간 약 ${mb(reclaimable)}`
  );

  if (candidates === 0) {
    console.log("\n비울 임베딩이 없습니다.");
    return;
  }
  if (maxRows !== null && candidates > maxRows) {
    // cron이 첫 대량 회수를 대신하지 않게 한다. 사람이 dry-run을 보고 --apply로 한 번 돌린다.
    console.error(
      `\n❌ 대상 ${candidates.toLocaleString()}행이 --max-rows=${maxRows.toLocaleString()}를 넘습니다. 쓰지 않았습니다.\n` +
        `   dry-run 출력을 확인한 뒤 로컬에서 \`npm run prune:embeddings -- --apply\`로 한 번 비우세요.`
    );
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("\n⚠️  DRY RUN — 쓰지 않았습니다. 반영하려면 --apply를 붙입니다.");
    return;
  }

  let cleared = 0;
  for (;;) {
    const n = await db.$executeRawUnsafe(
      `UPDATE "Article" SET embedding = NULL
       WHERE id IN (
         SELECT id FROM "Article"
         WHERE "bucketDate" < $1::date AND embedding IS NOT NULL
         LIMIT ${BATCH}
       )`,
      cutoff
    );
    if (n === 0) break;
    cleared += n;
    process.stdout.write(`\r   ${cleared.toLocaleString()} / ${candidates.toLocaleString()}`);
  }

  console.log(
    `\n\n✅ ${cleared.toLocaleString()}행의 임베딩을 비웠습니다. 디스크는 반납되지 않는다 — ` +
      `새 임베딩이 그 공간을 재사용한다(autovacuum 이후).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
