-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "leaning" TEXT NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cluster" (
    "id" TEXT NOT NULL,
    "representativeTitle" TEXT NOT NULL,
    "summary" TEXT,
    "centroidJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "embeddingJson" TEXT,
    "outletId" TEXT NOT NULL,
    "clusterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cluster_updatedAt_idx" ON "Cluster"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "Article"("url");

-- CreateIndex
CREATE INDEX "Article_clusterId_idx" ON "Article"("clusterId");

-- CreateIndex
CREATE INDEX "Article_outletId_idx" ON "Article"("outletId");

-- CreateIndex
CREATE INDEX "Article_clusterId_outletId_idx" ON "Article"("clusterId", "outletId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

