import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// 이관 전후 대조용 지문. 해시는 전부 Postgres 안에서 계산해 32자만 받아온다
// (23,861건 임베딩을 앱으로 퍼오면 egress가 수백 MB가 되므로).
//
//   npm run db:verify                              # DATABASE_URL (이관 전)
//   VERIFY_DATABASE_URL=<neon> npm run db:verify   # 이관 후
//
// 두 출력의 모든 값이 일치해야 이관 성공.

const connectionString = process.env.VERIFY_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 또는 VERIFY_DATABASE_URL이 필요합니다");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

interface Fingerprint {
  outlets: number;
  clusters: number;
  articles: number;
  outletHash: string;
  clusterHash: string;
  articleUrlHash: string;
  embeddingHash: string;
  centroidHash: string;
  articlesWithEmbedding: number;
  clustersWithCentroid: number;
  publishedMin: string;
  publishedMax: string;
}

async function fingerprint(): Promise<Fingerprint> {
  const [row] = await db.$queryRawUnsafe<Fingerprint[]>(`
    select
      (select count(*)::int from "Outlet")  as outlets,
      (select count(*)::int from "Cluster") as clusters,
      (select count(*)::int from "Article") as articles,

      (select md5(string_agg(id || '|' || name || '|' || leaning, ',' order by id)) from "Outlet") as "outletHash",
      (select md5(string_agg(id || '|' || "representativeTitle", ',' order by id)) from "Cluster") as "clusterHash",
      -- collation에 안 묶이도록 order by는 전부 id 기준. (Supabase=en_US.UTF-8 / Neon=C.UTF-8 라
      -- order by url 로 잡으면 같은 데이터인데도 해시가 갈린다.)
      (select md5(string_agg(url, ',' order by id)) from "Article") as "articleUrlHash",

      -- 임베딩 본문까지 대조. 행별로 먼저 md5를 떠서 문자열 집계 크기를 억제한다.
      (select md5(string_agg(md5("embeddingJson"), ',' order by id))
         from "Article" where "embeddingJson" is not null) as "embeddingHash",
      (select md5(string_agg(md5("centroidJson"), ',' order by id))
         from "Cluster" where "centroidJson" is not null) as "centroidHash",

      (select count(*)::int from "Article" where "embeddingJson" is not null) as "articlesWithEmbedding",
      (select count(*)::int from "Cluster" where "centroidJson"  is not null) as "clustersWithCentroid",

      (select min("publishedAt")::text from "Article") as "publishedMin",
      (select max("publishedAt")::text from "Article") as "publishedMax"
  `);
  return row;
}

async function main() {
  const host = new URL(connectionString!).host;
  console.log(`\n🔎 ${host}\n`);
  console.table(await fingerprint());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
