# Hybrid Video Pipeline (Remotion)

Programmatic lesson video renderer used by the Teacher Dashboard generate-video job.

## Setup

```bash
# from repo root
npm install
cd apps/remotion && npx remotion browser ensure
```

### Linux: Chrome Headless Shell system libraries

If render fails with `libnspr4.so: cannot open shared object file`, install Remotion's
shared libraries (requires sudo):

```bash
# from repo root
bash scripts/install-remotion-linux-deps.sh
```

Or manually:

```bash
sudo apt-get update && sudo apt-get install -y \
  libnspr4 libnss3 libnssutil3 libexpat1 libdbus-1-3 \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libxkbcommon0 libpango-1.0-0 libcairo2 libasound2
```

See: https://www.remotion.dev/docs/miscellaneous/linux-dependencies

## Preview in Remotion Studio

```bash
npm run remotion:studio
```

## Headless render (also invoked by the API worker)

```bash
cd apps/remotion
npx remotion render src/index.ts GamifiedLesson ../../apps/api/public/videos/demo.mp4
```

Pipeline output is written to `apps/api/public/videos/topic_<id>.mp4` and served at
`http://localhost:3001/public/videos/...`. Empty/corrupt MP4s are marked `failed` (not `pending_review`).
