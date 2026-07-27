# BrightPath

**One-on-one tutoring for every kid — at app prices.**

BrightPath is a mobile-first PWA that teaches reading, writing, and math the way a real private tutor would: patient, adaptive, and one student at a time.

## Why BrightPath

Private tutoring works — but at $40–80/hour, it's out of reach for most families. BrightPath brings the same personalized, step-by-step teaching to phones and tablets for a fraction of the cost.

## Features

- **True 1-on-1 feel** — conversational lessons, not worksheets
- **Reading, writing & math** — structured curricula for ages 5–14
- **Adaptive pacing** — adjusts to your child's level and confidence
- **Progress tracking** — see growth across subjects and skills
- **Works offline** — install as a PWA on any device
- **Privacy-first** — learner data stays on device

## Quick start

### Clone on Linux

```bash
# 1. Push from Windows first (see below), then on Linux:
git clone https://github.com/YOUR_USER/brightpath ~/Projects/brightpath
cd ~/Projects/brightpath
bash scripts/setup-linux.sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) on your phone or desktop.

### Push to GitHub (from Windows, one time)

The source files live on the Windows machine where Cursor created them. From PowerShell:

```powershell
cd C:\Users\gs-en\Projects\brightpath
pwsh -File scripts/push-to-github.ps1
```

If `gh` is not logged in: `gh auth login`

Then clone the printed URL on Linux (see above).

### Local dev (any platform)

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
npm run preview
```

## AI integration

The tutor engine ships with a built-in lesson system. To connect a live AI model (OpenAI, Anthropic, etc.), set `VITE_AI_API_KEY` in `.env` and the app will use it for open-ended tutoring responses.

## License

MIT
