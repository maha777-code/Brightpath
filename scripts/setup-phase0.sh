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

# Prisma reads .env from apps/api/ (not repo root)
cp .env apps/api/.env

# Vite uses proxy — requests go to /api → localhost:3001
grep '^VITE_' .env > apps/web/.env 2>/dev/null || true
if ! grep -q VITE_API_URL apps/web/.env 2>/dev/null; then
  echo 'VITE_API_URL=/api' > apps/web/.env
fi

if ! command -v docker >/dev/null 2>&1; then
  echo ""
  echo "NOTE: No Docker — use a free cloud Postgres (Neon/Supabase) and set DATABASE_URL in .env"
  echo "      Example: DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/brightpath?sslmode=require"
  echo "      Then: cp .env apps/api/.env && npm run db:push"
  echo ""
fi

echo "==> Copy styles and legacy pages into apps/web if needed..."
mkdir -p apps/web/src/styles apps/web/src/pages
if [ -f src/styles/global.css ] && [ ! -f apps/web/src/styles/global.css.bak ]; then
  cp src/styles/global.css apps/web/src/styles/global.css
fi
node scripts/migrate-monorepo.mjs || true

echo "==> Building workspace packages..."
npm run build -w @brightpath/shared
npm run build -w @brightpath/i18n

echo "==> Database push..."
npm run db:push

echo ""
echo "==> Phase 0 ready! Run:"
echo "    npm run dev"
echo ""
echo "  Web:  http://localhost:5173"
echo "  API:  http://localhost:3001/health"
