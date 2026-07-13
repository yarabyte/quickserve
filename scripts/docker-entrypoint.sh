#!/bin/sh
set -eu

export PRISMA_SCHEMA_PATH="${PRISMA_SCHEMA_PATH:-./prisma/schema.prisma}"

echo "[quickserve] Running prisma migrate deploy…"
node ./node_modules/prisma/build/index.js migrate deploy --schema "$PRISMA_SCHEMA_PATH"

# Belt-and-suspenders: ensure menu photo column exists even if migrate history drifts.
echo "[quickserve] Ensuring MenuItemCache.imageUrl column…"
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.$executeRawUnsafe("ALTER TABLE \"MenuItemCache\" ADD COLUMN IF NOT EXISTS \"imageUrl\" TEXT")
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (err) => {
    console.error("[quickserve] imageUrl ensure failed:", err && err.message ? err.message : err);
    try { await prisma.$disconnect(); } catch (_) {}
    process.exit(1);
  });
'

echo "[quickserve] Starting Next.js on :${PORT:-3000}"
exec node server.js
