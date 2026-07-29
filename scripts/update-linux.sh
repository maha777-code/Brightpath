#!/usr/bin/env bash
# Pull latest BrightPath code and apply local dev setup (run on Linux from repo root)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Pulling latest from GitHub..."
git pull origin main

echo "==> Installing dependencies..."
npm install

echo "==> Env files..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit DATABASE_URL / JWT_SECRET if needed."
fi
cp .env apps/api/.env
echo 'VITE_API_URL=/api' > apps/web/.env

echo "==> Building workspace packages..."
npm run build -w @brightpath/shared
npm run build -w @brightpath/i18n

echo "==> Database schema..."
npm run db:push

echo ""
echo "==> Updated! Start dev server:"
echo "    npm run dev"
echo ""
echo "  Web:  http://localhost:5173 (or next free port)"
echo "  API:  curl http://localhost:3001/health"
