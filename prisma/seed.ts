import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { OUTLETS } from "../src/lib/outlets";
import { generateEmbedding } from "../src/lib/clustering/embed";
import seedData from "../data/seed-articles.json";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database…");

  // 1. Outlets (언론사 메타데이터)
  for (const outlet of OUTLETS) {
    await db.outlet.upsert({
      where:  { id: outlet.id },
      update: { name: outlet.name, domain: outlet.domain, leaning: outlet.leaning },
      create: { id: outlet.id, name: outlet.name, domain: outlet.domain, leaning: outlet.leaning },
    });
  }
  console.log(`  ✓ ${OUTLETS.length} outlets`);

  // 2. Clusters
  for (const cluster of seedData.clusters) {
    await db.cluster.upsert({
      where:  { id: cluster.id },
      update: { representativeTitle: cluster.representativeTitle },
      create: { id: cluster.id, representativeTitle: cluster.representativeTitle },
    });
  }
  console.log(`  ✓ ${seedData.clusters.length} clusters`);

  // 3. Articles (generate mock embeddings + seed)
  let articleCount = 0;
  for (const article of seedData.articles) {
    const text = `${article.title} ${article.description}`;
    const embedding = await generateEmbedding(text);

    await db.article.upsert({
      where:  { id: article.id },
      update: {},
      create: {
        id:            article.id,
        title:         article.title,
        description:   article.description,
        url:           article.url,
        publishedAt:   new Date(article.publishedAt),
        outletId:      article.outletId,
        clusterId:     article.clusterId,
        embeddingJson: JSON.stringify(embedding),
      },
    });
    articleCount++;
  }
  console.log(`  ✓ ${articleCount} articles`);

  // 4. Compute and store centroid per cluster
  for (const cluster of seedData.clusters) {
    const articles = await db.article.findMany({
      where:  { clusterId: cluster.id, embeddingJson: { not: null } },
      select: { embeddingJson: true },
    });

    if (articles.length === 0) continue;

    const embeddings = articles.map((a) => JSON.parse(a.embeddingJson!) as number[]);
    const dim = embeddings[0].length;
    const centroid = new Array<number>(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) centroid[i] += emb[i] / embeddings.length;
    }

    await db.cluster.update({
      where: { id: cluster.id },
      data:  { centroidJson: JSON.stringify(centroid) },
    });
  }
  console.log("  ✓ cluster centroids computed");
  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
