-- CreateTable
CREATE TABLE "BlockedUrl" (
    "url" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUrl_pkey" PRIMARY KEY ("url")
);

-- CreateIndex
CREATE INDEX "BlockedUrl_createdAt_idx" ON "BlockedUrl"("createdAt");

