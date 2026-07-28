#!/usr/bin/env bash
# BrightPath Phase 0 setup — run from repo root
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Phase 0 setup"

if ! command -v docker >/dev/null 2>&1; then
  echo "WARN: Docker not found. Install Docker to run Postgres + Redis locally."
else
  echo "==> Starting Postgres + Redis..."
  docker compose up -d
  sleep 3
fi

echo "==> Installing dependencies..."
npm install

echo "==> Copy .env if missing..."
if [ ! -f .env ]; then cp .env.example .env; fi

echo "==> Copy styles and legacy pages into apps/web if needed..."
mkdir -p apps/web/src/styles apps/web/src/pages
if [ -f src/styles/global.css ] && [ ! -f apps/web/src/styles/global.css.bak ]; then
  cp src/styles/global.css apps/web/src/styles/global.css
fi
node scripts/migrate-monorepo.mjs || true

echo "==> Database push..."
npm run db:push

echo ""
echo "==> Phase 0 ready! Run:"
echo "    npm run dev"
echo ""
echo "  Web:  http://localhost:5173"
echo "  API:  http://localhost:3001/health"
