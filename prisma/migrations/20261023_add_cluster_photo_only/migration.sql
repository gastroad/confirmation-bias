-- AlterTable
ALTER TABLE "Cluster" ADD COLUMN     "photoOnly" BOOLEAN NOT NULL DEFAULT false;


-- 기존 클러스터는 `npm run backfill:photo-only`로 채운다. 판정이 정규식(isPhotoCaption)이라
-- SQL로 옮기면 두 판정이 갈린다.
