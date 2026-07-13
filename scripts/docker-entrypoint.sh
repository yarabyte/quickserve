#!/bin/sh
set -eu

export PRISMA_SCHEMA_PATH="${PRISMA_SCHEMA_PATH:-./prisma/schema.prisma}"
UPLOAD_ROOT="${UPLOAD_DIR:-/data/uploads}"

echo "[quickserve] Ensuring upload dir ${UPLOAD_ROOT}…"
mkdir -p "${UPLOAD_ROOT}/menu" || true
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "${UPLOAD_ROOT}" 2>/dev/null || true
  chmod -R u+rwX "${UPLOAD_ROOT}" 2>/dev/null || true
fi

run_as_app() {
  if [ "$(id -u)" = "0" ]; then
    su-exec nextjs "$@"
  else
    "$@"
  fi
}

echo "[quickserve] Running prisma migrate deploy…"
run_as_app node ./node_modules/prisma/build/index.js migrate deploy --schema "$PRISMA_SCHEMA_PATH"

echo "[quickserve] Ensuring MenuItemCache.imageUrl column…"
run_as_app node ./scripts/ensure-imageurl.js

echo "[quickserve] Starting Next.js on :${PORT:-3000}"
if [ "$(id -u)" = "0" ]; then
  exec su-exec nextjs node server.js
else
  exec node server.js
fi
