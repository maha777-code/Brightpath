# BrightPath Monorepo

**Phase 0** — Parent auth, child profiles, i18n, PostgreSQL + Redis.

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
4. **Tutor sessions** — reading / writing / math (scripted, Phase 1 adds LLM)

## API endpoints (Phase 0)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Parent signup |
| POST | `/auth/login` | Parent login |
| GET | `/auth/me` | Current parent (Bearer token) |
| GET | `/children` | List children |
| POST | `/children` | Create child |
| PATCH | `/children/:id` | Update child |
| DELETE | `/children/:id` | Delete child |

## Locales (i18n skeleton)

- `en-IN` — English (India)  
- `en-US` — English (US)  
- `hi-IN` — Hindi  
- `ar-AE` — Arabic (UAE / Dubai)  
- `ar-KW` — Arabic (Kuwait)  

RTL applied automatically for Arabic.

## Next: Phase 1

LLM tutor + RAG — requires `GEMINI_API_KEY` or `OPENAI_API_KEY`.

See `.env.example` for all future keys.
