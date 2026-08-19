#!/usr/bin/env bash
# Install system libraries required by Remotion Chrome Headless Shell on Linux.
# Fixes: libnspr4.so: cannot open shared object file
#
# Usage (from repo root):
#   bash scripts/install-remotion-linux-deps.sh
#
# Docs: https://www.remotion.dev/docs/miscellaneous/linux-dependencies

set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script is for Linux only (current OS: $(uname -s))."
  exit 0
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "ERROR: apt-get not found. Install Remotion Linux deps manually for your distro:"
  echo "  https://www.remotion.dev/docs/miscellaneous/linux-dependencies"
  exit 1
fi

echo "==> Installing Remotion Chrome Headless Shell system libraries (needs sudo)..."

# libnspr4 / libnss3 are required for chrome-headless-shell (NSS/NSPR).
# Also install Remotion's documented shared libs for Ubuntu/Debian.
sudo apt-get update
sudo apt-get install -y \
  libnspr4 \
  libnss3 \
  libnssutil3 \
  libexpat1 \
  libdbus-1-3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libxkbcommon0 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libx11-6 \
  libxext6 \
  fonts-liberation \
  || sudo apt-get install -y \
    libnspr4 \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64

echo "==> Verifying libnspr4..."
if ldconfig -p 2>/dev/null | grep -q 'libnspr4\.so'; then
  echo "    OK: libnspr4.so is on the linker path"
else
  # Still useful even if ldconfig -p is restricted
  dpkg -l libnspr4 2>/dev/null | grep -E '^ii' && echo "    OK: libnspr4 package installed" || true
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -d "$ROOT/apps/remotion" ]]; then
  echo "==> Ensuring Remotion Chrome Headless Shell binary..."
  (cd "$ROOT/apps/remotion" && npx remotion browser ensure)
fi

echo ""
echo "Done. Re-run video generation from the Teacher Dashboard."
echo "If render still fails, restart the API: npm run dev"
