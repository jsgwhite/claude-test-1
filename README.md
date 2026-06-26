# Wordle Clone

A small full-stack Wordle clone — built as a multi-agent vibe-coding learning exercise.
A real REST API backed by a local SQLite database (swappable), a React + Tailwind UI,
TDD-style tests, and a built-in diagnostics/observability layer.

## Stack
- **Monorepo:** npm workspaces, TypeScript (ESM) everywhere
- **`@wordle/shared`** — the REST contract: types, Zod schemas, endpoint/status/error constants
- **`@wordle/api`** — Fastify REST API + Drizzle ORM over SQLite, behind repository interfaces
- **`@wordle/web`** — React + Vite + Tailwind CSS
- **`e2e`** — Playwright smoke test

## Why the DB is easy to swap later
Route handlers depend only on the `GameRepository` / `StatsRepository` **interfaces**
(`packages/api/src/repositories/`), never on Drizzle or SQLite directly. To switch databases
you write one new implementation and change the single wiring point in
`packages/api/src/index.ts` — routes don't change. Drizzle adds a second layer (SQLite→Postgres
is mostly a dialect/connection change confined to `repositories/drizzle/`). An in-memory
implementation (`repositories/memory/`) is used by the tests, proving the seam works.

## Game rules
Random/unlimited mode: every `POST /api/games` starts a fresh game with a new random answer,
5-letter word, 6 guesses, per-letter feedback (correct / present / absent). The answer lives
only on the server and is `null` in every response until the game is won or lost.

## Setup
```bash
npm install
npm run build -w @wordle/shared   # the contract builds first
```

## Run
```bash
npm run dev:api    # Fastify on http://localhost:3001
npm run dev:web    # Vite on http://localhost:5173 (proxies /api -> :3001)
```
Open http://localhost:5173 and play.

## Test
```bash
npm test                 # all unit + integration tests (api + web)
npm run test:api         # API: scoring (TDD) + route integration (in-memory repo)
npm run test:web         # React component + hook tests
npm run e2e              # Playwright smoke (auto-starts both servers)
```

## REST API
Base `/api`. Player identity via the `x-player-id` header (client-generated UUID; no auth).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/games` | Start a new game → `GameState` (answer `null`) |
| POST | `/api/games/:id/guesses` | Submit a guess → `GuessResponse` |
| GET | `/api/games/:id` | Fetch game state |
| GET | `/api/stats` | Player aggregate stats |
| GET | `/api/health` | Liveness + DB ping |
| GET | `/api/metrics` | Per-route request counts + latency percentiles |

Errors use a stable envelope `{ "error": { "code", "message" } }`:
`INVALID_LENGTH` (400), `NOT_IN_DICTIONARY` (422, does **not** consume a guess),
`GAME_NOT_FOUND` (404), `GAME_OVER` (409).

## Diagnostics
`packages/api/src/plugins/diagnostics.ts` installs structured request logging (with a
correlation `reqId`), per-route latency metrics (min/avg/p50/p95/max) and error counts exposed
at `GET /api/metrics`, a global error handler that emits the shared error envelope, and a
`GET /api/health` check that pings the DB.

## Configuration (env)
- `PORT` (default 3001), `HOST`, `DB_FILE` (default `wordle.sqlite`)
- `WORDLE_FORCE_ANSWER` — force a known answer (used for deterministic tests/e2e)
