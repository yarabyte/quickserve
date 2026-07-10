#!/bin/sh
set -eu

echo "[quickserve] Running prisma migrate deploy…"
node ./node_modules/prisma/build/index.js migrate deploy

echo "[quickserve] Starting Next.js on :${PORT:-3000}"
exec node server.js
