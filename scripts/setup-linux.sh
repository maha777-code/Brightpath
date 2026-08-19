#!/usr/bin/env bash
# Run on Linux AFTER cloning from GitHub:
#   git clone https://github.com/YOUR_USER/brightpath ~/Projects/brightpath
#   cd ~/Projects/brightpath && bash scripts/setup-linux.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> BrightPath setup on Linux"
echo "    Directory: $(pwd)"

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js not found. Install Node 18+ first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

echo "==> Node $(node -v), npm $(npm -v)"
echo "==> Installing dependencies..."
npm install

if [[ "$(uname -s)" == "Linux" ]]; then
  echo ""
  echo "==> Remotion Linux Chrome dependencies (libnspr4 / NSS)..."
  bash "$(dirname "$0")/install-remotion-linux-deps.sh" || {
    echo "WARNING: Remotion system libs install failed. Video render may break."
    echo "         Re-run: bash scripts/install-remotion-linux-deps.sh"
  }
fi

echo ""
echo "==> Done! Start the dev server:"
echo "    npm run dev"
echo ""
echo "    Then open http://localhost:5173"
