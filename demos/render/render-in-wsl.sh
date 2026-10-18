#!/usr/bin/env bash
# Renders the demo MP4 from WSL, reusing the Chrome + ffmpeg binaries that Remotion already downloaded.
# Usage (from Windows): wsl -d Ubuntu-26.04 -e bash demos/render/render-in-wsl.sh
set -euo pipefail

REMOTION_REPO="${REMOTION_REPO:-/home/mahalakshmi/Brightpath}"
DEPS="${MV_DEPS:-$HOME/mv-render-deps}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$DEPS/node_modules/puppeteer-core" ]; then
  mkdir -p "$DEPS"
  printf '{"name":"mv-render-deps","private":true}\n' > "$DEPS/package.json"
  (cd "$DEPS" && npm i puppeteer-core@23 --no-audit --no-fund --silent)
fi

COMPOSITOR="$REMOTION_REPO/node_modules/@remotion/compositor-linux-x64-gnu"
export FFMPEG="$COMPOSITOR/ffmpeg" FFPROBE="$COMPOSITOR/ffprobe"
export LD_LIBRARY_PATH="$COMPOSITOR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export CHROME_PATH="$REMOTION_REPO/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell"
export MV_DEPS="$DEPS"

if [ -z "${ELEVENLABS_API_KEY:-}" ] && [ -f "$REMOTION_REPO/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^ELEVENLABS_(API_KEY|VOICE_ID)=' "$REMOTION_REPO/.env" | sed 's/\r$//')
  set +a
fi

node "$HERE/render-demo-video.mjs"
