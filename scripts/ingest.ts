import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../server/db";
import { ingestArticle, loadRecentClusters } from "../server/clustering/cluster";

interface CollectedArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  outletId: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 정적 import가 아니라 런타임에 읽는다. data/new-articles.json은 collect 산출물이라
// gitignore되어 빌드/타입체크 시점(Vercel)엔 존재하지 않기 때문.
function loadNewArticles(): CollectedArticle[] {
  const dataPath = path.resolve(__dirname, "../data/new-articles.json");
  return JSON.parse(fs.readFileSync(dataPath, "utf8")) as CollectedArticle[];
}

async function main() {
  const articles = loadNewArticles();

  // 이미 적재된 URL은 임베딩 전에 제외한다.
  // 중복 재임베딩(비용·지연)과 중복발 유령 클러스터 생성을 막는다.
  const existing = await db.article.findMany({
    where: { url: { in: articles.map((a) => a.url) } },
    select: { url: true },
  });
  const seen = new Set(existing.map((e) => e.url));
  const fresh = articles.filter((a) => !seen.has(a.url));

  console.log(`🔍 수집 ${articles.length}건 · 기존 ${seen.size}건 · 신규 ${fresh.length}건 적재\n`);

  // 최근 클러스터 centroid는 run당 1회만 로드하고, 배정·신규 시 메모리에서 갱신한다.
  // (기사마다 전체 centroid를 재조회하던 egress 폭증을 제거)
  const recent = await loadRecentClusters();

  for (const article of fresh) {
    console.log(`📰 "${article.title}"`);
    const result = await ingestArticle(
      {
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: article.publishedAt,
        outletId: article.outletId,
      },
      recent
    );

    const icon =
      result.action === "assigned"
        ? "✅"
        : result.action === "judge_assigned"
          ? "🤖✅"
          : result.action === "judge_rejected"
            ? "🤖❌"
            : "🆕";

    console.log(
      `   ${icon} action=${result.action}  score=${result.score.toFixed(3)}  clusterId=${result.clusterId}\n`
    );
  }

  console.log("✅ Ingestion complete. Refresh the dashboard to see updates.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
