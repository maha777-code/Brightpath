#!/usr/bin/env bash
# Sync latest BrightPath from GitHub on Linux — run: bash scripts/sync-latest.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull..."
git pull origin main

echo "==> env..."
cp .env apps/api/.env 2>/dev/null || (cp .env.example .env && cp .env apps/api/.env)
echo 'VITE_API_URL=/api' > apps/web/.env

echo "==> build packages..."
npm run build -w @brightpath/shared
npm run build -w @brightpath/i18n

echo "==> done"
git log -1 --oneline
grep -n 'handleLogout' apps/web/src/pages/Home.tsx || echo "WARN: Home.tsx logout not found"
