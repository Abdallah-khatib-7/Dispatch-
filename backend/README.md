# Dispatch — Backend

Self-hosted job-application tracker. Reads Gmail (read-only), detects application
confirmation emails, extracts `{company, role, status}`, and **deduplicates** so
the count is trustworthy — every application traces back to the raw Gmail message
IDs behind it.

## Runtime

TypeScript 7 (native compiler) + Node 22. Run directly from source via Node's
type-stripping — no build step for dev. ESM, `"type": "module"`; relative imports
carry `.ts` extensions.

```bash
npm run typecheck     # tsc --noEmit
npm start             # run the server from source
npm run dev           # same, with --watch
npm run build         # optional: emit dist/ (rewrites .ts imports to .js)
npm run token         # print an API bearer token for the /api endpoints
npm run test:dedup    # dedup unit tests
node --experimental-strip-types --env-file=.env src/scripts/seed.ts   # offline pipeline demo
node --experimental-strip-types --env-file=.env src/scripts/fetchOnce.ts [maxResults] [query]
```

All scripts load `.env` via Node's native `--env-file`.

## First-run setup (two manual steps)

1. **Connect Gmail** — open `http://localhost:3000/auth/google` in a browser,
   complete Google consent (the account must be a tester on the OAuth consent
   screen). The callback stores AES-256-GCM-encrypted tokens and returns an
   `apiToken`. Scope requested: `gmail.readonly` only.
2. **OpenAI key** — set `OPENAI_API_KEY` in `.env` to enable LLM extraction.
   Without it the server runs `heuristic-only` (deterministic pattern matching);
   `GET /health` shows which mode is active.

## Auth

`/auth/*` and `/health` are public. All `/api/*` endpoints require
`Authorization: Bearer <token>` (HS256 JWT signed with `JWT_SECRET`). Get a token
from the OAuth callback or `npm run token`.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/health` | status + extraction mode |
| GET  | `/auth/google` | redirect to Google consent |
| GET  | `/auth/google/callback` | exchange code, store tokens, return `apiToken` |
| POST | `/api/ingest/run` | manual fetch → extract → dedup. Body: `{ maxResults?: 1-100, query?: string }` |
| GET  | `/api/ingest/usage` | today's LLM call count vs cap |
| GET  | `/api/applications` | list. Filters: `status`, `reviewStatus`, `company`, `from`, `to`, `limit`, `offset` |
| GET  | `/api/applications/:id` | one application **plus every raw Gmail source** (traceability) |
| GET  | `/api/applications/stats` | total counted, needs-review, by-status, by-day, by-week |
| GET  | `/api/review` | needs-review queue, each item with its sources |
| POST | `/api/review/:id` | `{ action: "confirm" \| "reject" \| "correct", company?, role?, status? }` |

## How the count stays honest

- **`application_sources.gmail_message_id` is UNIQUE** → re-ingesting the same
  inbox never double-counts (idempotent).
- **Dedup** (`src/services/dedup.ts`, pure/tested): same account + normalized
  company + compatible role within a 14-day window collapse to one application.
  Covers the LinkedIn ~3-day reminder and Workable multi-email sequence.
- **Confidence threshold 0.75**: below it, an extraction is held in the review
  queue instead of being auto-counted.
- **Stats count only** `auto_confirmed` + human-`confirmed`; never
  `needs_review` or `rejected`.

## Data model

`oauth_tokens` (encrypted) · `applications` (canonical) · `application_sources`
(raw evidence, FK to application) · `llm_usage` (per-day cost-cap counter).
Schema auto-applies at boot (`CREATE TABLE IF NOT EXISTS`).

## Not built yet (later phases)

Gmail Pub/Sub push, scheduler refinement, frontend dashboard, Docker.
