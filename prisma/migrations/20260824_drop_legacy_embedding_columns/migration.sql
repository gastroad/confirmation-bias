-- 선행 조건: `npm run cluster:day -- --all` 로 모든 기사가 일별 클러스터에 재배정되어 있어야 한다.
-- 증분 배정 시절의 클러스터(bucketDate 없음)는 그 시점에 고아가 되므로 여기서 지운다.
DELETE FROM "Cluster" WHERE "bucketDate" IS NULL;

-- AlterTable
ALTER TABLE "Article" DROP COLUMN "embeddingJson",
ALTER COLUMN "bucketDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "Cluster" DROP COLUMN "centroidJson",
ALTER COLUMN "bucketDate" SET NOT NULL;

-- Postgres는 DROP COLUMN만으로 디스크를 돌려주지 않는다. 마이그레이션은 트랜잭션 안에서
-- 돌아 VACUUM FULL을 넣을 수 없으므로, 적용 후 아래를 따로 실행해 공간을 회수한다:
--   VACUUM FULL "Article"; VACUUM FULL "Cluster";
