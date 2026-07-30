# BrightPath Monorepo

**Phase 0** — Parent auth, child profiles, i18n, PostgreSQL + Redis.  
**Phase 1** — LLM tutor (Gemini/OpenAI) + lightweight RAG knowledge snippets.

## Structure

```
brightpath/
├── apps/
│   ├── web/          # React PWA (@brightpath/web)
│   └── api/          # Express + Prisma API (@brightpath/api)
├── packages/
│   ├── shared/       # Shared TypeScript types
│   └── i18n/         # en-IN, en-US, hi-IN, ar-AE, ar-KW
├── docker-compose.yml
└── scripts/setup-phase0.sh
```

## Phase 0 setup

**Requirements:** Node 20+, Docker (for Postgres + Redis)

```bash
# Linux / macOS
bash scripts/setup-phase0.sh

# Or manually:
cp .env.example .env
npm run docker:up
npm install
npm run migrate:monorepo   # moves legacy root src/ → apps/web/
npm run db:push
npm run dev
```

- **Web:** http://localhost:5173  
- **API health:** http://localhost:3001/health  

## Phase 0 user flow

1. **Register** parent account (`/register`) — pick locale  
2. **Add child** profile (`/parent/children/new`)  
3. **Select child** on parent dashboard → learning dashboard  
4. **Tutor sessions** — reading / writing / math (AI when `GEMINI_API_KEY` or `OPENAI_API_KEY` is set; scripted fallback otherwise)

## Phase 1 — LLM tutor setup

Add to `.env` (and `apps/api/.env`):

```bash
GEMINI_API_KEY=your-key-here
# or OPENAI_API_KEY=sk-...
```

Restart the API. Check:

```bash
curl http://localhost:3001/health
# → { "phase": 1, "llm": true, ... }

curl http://localhost:3001/tutor/status
# → { "llmAvailable": true, "provider": "gemini", "phase": 1 }
```

Tutor sessions automatically use the LLM when available. Lesson structure stays the same; Ms. Bright evaluates answers with RAG context from curated teaching snippets.

## API endpoints (Phase 0–1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Parent signup |
| POST | `/auth/login` | Parent login |
| GET | `/auth/me` | Current parent (Bearer token) |
| GET | `/children` | List children |
| POST | `/children` | Create child |
| PATCH | `/children/:id` | Update child |
| DELETE | `/children/:id` | Delete child |
| GET | `/tutor/status` | LLM availability (Phase 1) |
| POST | `/tutor/greeting` | AI lesson greeting (Bearer, Phase 1) |
| POST | `/tutor/respond` | AI evaluate student answer (Bearer, Phase 1) |

## Locales (i18n skeleton)

- `en-IN` — English (India)  
- `en-US` — English (US)  
- `hi-IN` — Hindi  
- `ar-AE` — Arabic (UAE / Dubai)  
- `ar-KW` — Arabic (Kuwait)  

RTL applied automatically for Arabic.

## Next: Phase 2

Voice (Deepgram, ElevenLabs, LiveKit) — see `.env.example`.

## Phase 1 keys (current)

`GEMINI_API_KEY` or `OPENAI_API_KEY` — required for AI tutor.

## Future keys
