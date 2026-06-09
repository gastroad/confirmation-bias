/**
 * Ingest pipeline demo
 *
 * Reads data/new-articles.json and runs each article through the clustering pipeline:
 *   score ≥ 0.85  → direct assignment to existing cluster
 *   0.70–0.85     → LLM judge decides (mock in MVP)
 *   score < 0.70  → new cluster created
 *
 * Usage: npm run ingest
 */

import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { ingestArticle } from "../src/lib/clustering/cluster";
import newArticles from "../data/new-articles.json";

// Bootstrap the prisma singleton that cluster.ts reads via lib/db
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });
(globalThis as Record<string, unknown>).prisma = prisma;

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
  .finally(() => prisma.$disconnect());
