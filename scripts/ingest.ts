import { db } from "../server/db";
import { ingestArticle } from "../server/clustering/cluster";
import newArticles from "../data/new-articles.json";

async function main() {
  console.log(`🔍 Ingesting ${newArticles.length} new articles…\n`);

  for (const article of newArticles) {
    console.log(`📰 "${article.title}"`);
    const result = await ingestArticle({
      title:       article.title,
      description: article.description,
      url:         article.url,
      publishedAt: article.publishedAt,
      outletId:    article.outletId,
    });

    const icon =
      result.action === "assigned"       ? "✅" :
      result.action === "judge_assigned" ? "🤖✅" :
      result.action === "judge_rejected" ? "🤖❌" : "🆕";

    console.log(`   ${icon} action=${result.action}  score=${result.score.toFixed(3)}  clusterId=${result.clusterId}\n`);
  }

  console.log("✅ Ingestion complete. Refresh the dashboard to see updates.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
