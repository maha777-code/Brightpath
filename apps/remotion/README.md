# Hybrid Video Pipeline (Remotion)

Programmatic lesson video renderer used by the Teacher Dashboard generate-video job.

## Setup

```bash
# from repo root
npm install
cd apps/remotion && npx remotion browser ensure
```

## Preview in Remotion Studio

```bash
npm run remotion:studio
```

## Headless render (also invoked by the API worker)

```bash
cd apps/remotion
npx remotion render src/index.ts GamifiedLesson ../../apps/api/uploads/videos/demo.mp4
```

If Chromium/Remotion is unavailable, the API pipeline still completes with:
- LLM (or heuristic) structured script JSON
- ElevenLabs / OpenAI TTS (or silent WAV + word timings)
- Sample MP4 fallback for the review modal
