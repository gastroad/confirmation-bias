import { db } from "../server/db";
import { clusterDay, DEFAULT_THRESHOLD } from "../server/clustering/daily";
import {
  eachBucket,
  formatBucketDate,
  parseBucketDate,
  toBucketDate,
} from "../server/clustering/bucket";

// KST 하루치를 통째로 클러스터링한다. 멱등하므로 같은 날짜를 몇 번 돌려도 결과가 같다.
//
//   npm run cluster:day                                   # 어제(KST) — cron 기본
//   npm run cluster:day -- --date=2026-08-23
//   npm run cluster:day -- --from=2026-06-01 --to=2026-08-23
//   npm run cluster:day -- --all                          # 기사가 존재하는 모든 날짜
//   npm run cluster:day -- --date=2026-08-20 --dry-run --threshold=0.65
//   npm run cluster:day -- --date=2026-08-20 --dry-run --embed-missing --threshold=0.65
//
// --dry-run은 DB에 쓰지 않고 크기 분포만 낸다(임계값 튜닝용).
// 보존 기간(server/clustering/retention.ts)이 지난 날짜는 임베딩이 비어 있어 dry-run이 기사를
// 빼고 돈다. --embed-missing을 붙이면 메모리에서 다시 임베딩한다(OPENAI_API_KEY 필요, DB엔 안 씀).

interface Args {
  /** null이면 DB에 기사가 존재하는 날짜만 골라 돈다. */
  range: { from: Date; to: Date } | null;
  threshold: number;
  dryRun: boolean;
  embedMissing: boolean;
}

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string>();
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) flags.set(m[1], m[2] ?? "true");
  }

  const dryRun = flags.get("dry-run") === "true";
  const embedMissing = flags.get("embed-missing") === "true";
  if (embedMissing && !dryRun) {
    // dry-run이 아니면 임베딩 없는 기사는 원래 임베딩해서 쓴다. 지난 날짜를 쓰기 모드로 돌리는
    // 실수(색인 URL 404)를 이 플래그가 부추기지 않게 막는다.
    throw new Error("--embed-missing은 --dry-run과 함께만 씁니다");
  }
  const threshold = flags.has("threshold") ? Number(flags.get("threshold")) : DEFAULT_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold <= -1 || threshold > 1) {
    throw new Error(`--threshold는 -1~1 사이여야 합니다: ${flags.get("threshold")}`);
  }

  if (flags.get("all") === "true") return { range: null, threshold, dryRun, embedMissing };

  if (flags.has("date")) {
    const d = parseBucketDate(flags.get("date")!);
    return { range: { from: d, to: d }, threshold, dryRun, embedMissing };
  }
  if (flags.has("from") || flags.has("to")) {
    if (!flags.has("from") || !flags.has("to")) {
      throw new Error("--from 과 --to 는 함께 지정해야 합니다");
    }
    const from = parseBucketDate(flags.get("from")!);
    const to = parseBucketDate(flags.get("to")!);
    if (from > to) throw new Error("--from 이 --to 보다 늦습니다");
    return { range: { from, to }, threshold, dryRun, embedMissing };
  }

  // 기본값: 어제(KST). cron은 KST 새벽에 돌아 전날 하루를 마감한다.
  const yesterday = new Date(toBucketDate(new Date()).getTime() - 24 * 60 * 60 * 1000);
  return { range: { from: yesterday, to: yesterday }, threshold, dryRun, embedMissing };
}

/**
 * 기사가 존재하는 날짜만 고른다. 백필을 날짜 범위로 돌리면 2023-03의 이상치 20건 때문에
 * 기사가 없는 1,200여 일까지 훑으며 DB를 그만큼 왕복한다.
 */
async function daysWithArticles(): Promise<Date[]> {
  const rows = await db.article.findMany({
    distinct: ["bucketDate"],
    select: { bucketDate: true },
    orderBy: { bucketDate: "asc" },
  });
  return rows.map((r) => r.bucketDate);
}

async function main() {
  const { range, threshold, dryRun, embedMissing } = parseArgs(process.argv.slice(2));
  const days = range ? eachBucket(range.from, range.to) : await daysWithArticles();
  if (days.length === 0) {
    console.log("대상 날짜가 없습니다.");
    return;
  }

  console.log(
    `🗓  ${formatBucketDate(days[0])} ~ ${formatBucketDate(days[days.length - 1])} (${days.length}일) · threshold ${threshold}${dryRun ? " · DRY RUN" : ""}\n`
  );
  console.log("날짜         기사   클러스터   최대   단독   신규임베딩");
  console.log("-".repeat(58));

  const totals = { articles: 0, clusters: 0, embedded: 0, largest: 0, skipped: 0 };

  for (const day of days) {
    const r = await clusterDay(day, { threshold, dryRun, embedMissing });
    totals.skipped += r.skipped;
    if (r.articles === 0) continue;

    totals.articles += r.articles;
    totals.clusters += r.clusters;
    totals.embedded += r.embedded;
    totals.largest = Math.max(totals.largest, r.largest);

    console.log(
      `${r.bucketDate}  ${String(r.articles).padStart(5)}  ${String(r.clusters).padStart(8)}  ${String(r.largest).padStart(5)}  ${String(r.singletons).padStart(5)}  ${String(r.embedded).padStart(10)}`
    );
  }

  console.log("-".repeat(58));
  console.log(
    `합계        ${String(totals.articles).padStart(5)}  ${String(totals.clusters).padStart(8)}  ${String(totals.largest).padStart(5)}         ${String(totals.embedded).padStart(10)}`
  );
  if (totals.skipped > 0) {
    // 보존 기간이 지난 날짜에서 조용히 빈 결과가 나오면 튜닝 결론이 틀린다.
    console.log(
      `\n⚠️  임베딩이 없어 ${totals.skipped.toLocaleString()}건을 빼고 돌았습니다(보존 기간이 지난 날짜). ` +
        `--embed-missing을 붙이면 메모리에서 다시 임베딩합니다.`
    );
  }
  if (dryRun) console.log("\n⚠️  DRY RUN — DB에 쓰지 않았습니다.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
