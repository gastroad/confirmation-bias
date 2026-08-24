-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "bucketDate" DATE,
ADD COLUMN     "embedding" BYTEA;

-- AlterTable
ALTER TABLE "Cluster" ADD COLUMN     "articleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bucketDate" DATE;

-- CreateIndex
CREATE INDEX "Article_bucketDate_idx" ON "Article"("bucketDate");

-- CreateIndex
CREATE INDEX "Article_bucketDate_clusterId_idx" ON "Article"("bucketDate", "clusterId");

-- CreateIndex
CREATE INDEX "Cluster_bucketDate_articleCount_id_idx" ON "Cluster"("bucketDate", "articleCount" DESC, "id" DESC);

-- publishedAt(UTC, timestamp without tz)의 KST 날짜로 bucketDate를 채운다.
-- 한국은 DST가 없어 고정 +9. server/clustering/bucket.ts의 toBucketDate와 같은 규칙이다.
UPDATE "Article" SET "bucketDate" = ("publishedAt" + interval '9 hours')::date;

-- 기존 클러스터에도 소속 기사 수를 채워 둔다(일별 백필 전까지의 과도기 정합).
UPDATE "Cluster" c SET "articleCount" = sub.n
FROM (SELECT "clusterId", count(*)::int AS n FROM "Article" WHERE "clusterId" IS NOT NULL GROUP BY 1) sub
WHERE c.id = sub."clusterId";
