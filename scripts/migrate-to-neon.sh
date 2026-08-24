#!/usr/bin/env bash
# Supabase public 스키마 → Neon 이관.
#
# 스키마는 Prisma(db push)가 만들고 데이터만 COPY로 옮긴다. pg_dump(18) 덤프를
# Neon(17)에 그대로 복원하면 상위→하위 복원이 되어 깨질 수 있어서, 버전에 안 묶이는
# --data-only 경로만 쓴다.
#
# 필요한 .env 키: SUPABASE_DIRECT_URL(5432 session), NEON_DIRECT_URL
#
# 2026-08-24 실행 완료. 재실행하면 Neon 데이터가 중복되니 롤백 후 재이관 때만 쓸 것.
# 실행: bash scripts/migrate-to-neon.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN="$(brew --prefix libpq)/bin"
DUMP_DIR="data/neon-migration"

set -a; . ./.env; set +a
: "${SUPABASE_DIRECT_URL:?SUPABASE_DIRECT_URL이 .env에 없습니다}"
: "${NEON_DIRECT_URL:?NEON_DIRECT_URL이 .env에 없습니다}"

mkdir -p "$DUMP_DIR"

echo "▶ 1/3  Neon에 스키마 생성 (prisma db push)"
DIRECT_URL="$NEON_DIRECT_URL" npx prisma db push

# FK 순서대로 옮긴다. Article.outletId → Outlet, Article.clusterId → Cluster 이므로
# 부모부터. (pg_dump는 --table 나열 순서가 아니라 자체 순서로 뱉기 때문에 테이블별로 분리)
for T in Outlet Cluster Article; do
  echo "▶ 2/3  dump: $T"
  "$PGBIN/pg_dump" "$SUPABASE_DIRECT_URL" \
    --data-only --no-owner --no-privileges --format=plain \
    --table="public.\"$T\"" > "$DUMP_DIR/$T.sql"
  echo "        $(du -h "$DUMP_DIR/$T.sql" | cut -f1)"
done

for T in Outlet Cluster Article; do
  echo "▶ 3/3  restore: $T"
  "$PGBIN/psql" "$NEON_DIRECT_URL" \
    --quiet --single-transaction --set ON_ERROR_STOP=on \
    --file "$DUMP_DIR/$T.sql"
done

echo
echo "✅ 이관 완료. 다음으로 지문을 대조하세요:"
echo "   npm run db:verify                                   # Supabase"
echo "   VERIFY_DATABASE_URL=\"\$NEON_DATABASE_URL\" npm run db:verify   # Neon"
