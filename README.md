# Agile Tracker (Nostr-powered)

A command-line agile tracker that uses Nostr events as the canonical, distributed event stream and a local Prisma + SQLite database as an offline cache.

This README reflects the current repository layout and common development workflows.

---

## Quick summary

- Local cache: Prisma + SQLite (file: `prisma/dev.db`).
- Distributed state: Nostr relays (events are the source of truth).
- Code organization: domain models in `src/models`, services in `src/services`, Nostr helpers in `src/nostr`, CLI under `src/app` / `src/cli`.

---

## Files & structure (important parts)

```
src/
  app/                # CLI entrypoint and wiring (src/app/main.ts)
  cli/                # command definitions (ticket/user commands)
  interfaces/         # typed interfaces for domain shapes
  models/             # domain shapes + mapping helpers (e.g. ticket-data.ts)
  services/           # business logic and Prisma usage (returns domain models)
    prisma/           # Prisma-specific helpers
  nostr/              # nostr helpers, event builders, and sync utilities
  tui/                # terminal UI flows
  __tests__/          # unit tests
prisma/
  schema.prisma       # Prisma schema
  dev.db              # local SQLite DB (cache - safe to recreate)
package.json
tsconfig.json
README.md
```

Files you’ll likely use frequently:

- `src/models/ticket-data.ts` — `TicketData` domain model and prisma <-> domain mapping functions
- `src/services/ticket.ts` — ticket CRUD and business logic (returns `TicketData`)
- `src/nostr/sync.ts` — subscription helpers (emit events via callbacks)
- `src/nostr/ticket-events.ts` — create/publish signed Nostr events for tickets

---

## Install & setup

1. Clone repo and install:

```bash
git clone <repo-url>
cd agile-tracker
npm install
```

2. Generate Prisma client (after schema changes):

```bash
npx prisma generate
npx prisma db push
```

If you accidentally delete `prisma/dev.db` or want a clean slate, remove `prisma/migrations` and `prisma/dev.db` and re-run `npx prisma migrate dev` or `npx prisma db push`.

---

## Scripts

- `npm run build` — compile TypeScript (`tsc`)
- `npm run dev` — run in dev mode with `ts-node` (entry: `src/index.ts`)
- `npm run test` — run unit tests (Vitest)
- `npm run cli` — run the CLI via `npx tsx ./src/app/main.ts`
- `npm run db:push` — push Prisma schema to the DB

---

## TUI (terminal UI) usage

The primary user interface is a terminal-based UI (TUI). Run it with:

```bash
npm run cli
```

This launches the interactive TUI implemented under `src/tui` and wired from `src/app/main.ts`.

Notes:
- Legacy non-interactive CLI command handlers are still present under `src/cli` (useful for scripts or ad-hoc commands), but the TUI is the recommended entrypoint for day-to-day use.
- If you want to run a specific CLI command directly you can still use the `npm run cli -- <command>` form (it delegates to the same app wiring).

---

## Development patterns: Nostr + local cache

This project intentionally separates concerns:

- `src/nostr/*` handles Nostr-specific jobs: creating events, signing, publishing, and subscription helpers.
- Subscription helpers (e.g. `subscribeToProjectUpdates`) are database-agnostic and accept callbacks. Your app code (CLI or services) registers callbacks which persist changes to Prisma.
- `src/services/*` contain the single source of truth for how to store domain models locally (mapping, CRUD and validation).

Recommended sync pattern:

1. Subscribe to project-level events (tagged with `#project` and `['updated', <uuid>]`).
2. When a project event arrives, inspect tags to find which ticket(s) or member(s) changed.
3. Query the relays for the specific ticket event(s) using a `#d` filter and apply the resulting event payload via your service layer to Prisma.

This lets the Nostr event stream remain canonical while your local DB is a fast offline cache.

---

## Testing

Run unit tests:

```bash
npm test
```

Tests live in `src/__tests__` and use Vitest.

---

## Notes & recommendations

- Keep domain models in `src/models` and avoid importing Prisma types directly in the rest of the app. Use mapping helpers instead.
- Keep Nostr publishing/finalization in `src/nostr` and the rest of your app database-agnostic by emitting updates via callbacks.
- If you need to reset the local DB during development, removing `prisma/dev.db` and re-running `npx prisma db push` is the quickest route.

---

---

## Getting started (quick walkthrough)

A minimal flow to create a project, add a ticket, publish an update, and see it picked up via sync.

1) Start the TUI (recommended):

```bash
npm run cli
```

## Running a local Nostr relay (for testing)

You can run a local relay for development. Here's a minimal Docker Compose template — pick a relay image you trust (Rust/Go/Node implementations are available).

```yaml
version: '3.7'
services:
  nostr-relay:
    image: federatedai/nostr-relay:latest # replace with a known relay image
    restart: unless-stopped
    ports:
      - "7000:7000"
    environment:
      - PORT=7000
    volumes:
      - ./relay-data:/data

# Start with:
# docker compose up -d
```

Point your app at `wss://localhost:7000` in your `relays` array and test publishing/subscribing locally.

Notes:
- Relay images and env var names vary between implementations; consult the relay project's README for specifics.
- Public relays are fine for quick tests but avoid sensitive data when using public relays.

---

License: MIT
