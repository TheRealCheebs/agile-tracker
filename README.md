# NostrTrack (Nostr-native, TUI-first)

NostrTrack is a Nostr-native, terminal-first project tracker built for small distributed teams. It treats Nostr events as the canonical, censorship-resistant event stream and uses a local Prisma + SQLite database as an optional offline cache and working set. Identity is pubkey-first (Nostr keys), and projects/tickets use UUIDs so they can be created and referenced safely across disconnected peers.

This README documents the repository layout, development workflows, and the recommended sync pattern between Nostr relays and the local cache.

---

## Quick summary

- Canonical store: Nostr relays — signed events are the source of truth and carry provenance (pubkey, sig).
- Local cache: Prisma + SQLite (file: `prisma/dev.db`) — fast, offline-friendly cache that is safe to recreate.
- Identity: Nostr pubkeys are first-class identities; no centralized user accounts.
- Identifiers: UUIDs for projects and tickets to ensure distributed uniqueness across peers.
- UX: TUI-first CLI workflow for speed and privacy; optional locally hosted web UI available.
- Code organization: domain models in `src/models`, services (DB/persistence) in `src/services`, Nostr helpers in `src/nostr`, TUI flows in `src/tui`.
- Recommended sync: subscribe to `#project`-tagged project events, inspect `['updated', <uuid>]` tags, and fetch ticket events by `#d` (ticket UUID) to persist via the service layer.

---

## Project description

### Problem Statement
Small distributed teams face significant challenges with existing project management tools:

- **Censorship Vulnerability:** Centralized platforms (Jira, Trello, GitHub Projects) can restrict access or shut down accounts
- **Data Sovereignty Issues:** Teams lose control of project data to third-party servers
- **Cost Barriers:** Enterprise tools are expensive and over-engineered for small teams
- **Centralized Dependencies:** Most tools require centralized infrastructure, creating single points of failure

### Solution
NostrTrack is a lightweight, Nostr-native project tracking system designed specifically for small distributed teams. It combines:

- **Decentralized Architecture:** Built on Nostr for censorship-resistant data storage and user authentication
- **CLI/TUI-First Workflow:** Terminal-based interface for speed, privacy, and low-resource environments
- **Local Web Hosting:** Optional self-hosted web interface that avoids centralized servers
- **Agile Essentials:** Core features inspired by Pivotal Tracker/Trello (sprints, backlogs, task assignment)

### Key Features

- **Nostr Integration:** User authentication via Nostr keys; project data stored as Nostr events
- **Core Functionality:** Create projects, manage tasks, assign owners, track status (To Do/In Progress/Done)
- **Agile Support:** Sprints, story points, backlog prioritization
- **Dual Interfaces:** Full-featured CLI/TUI + locally launchable web UI
- **Data Portability:** Export/import projects (JSON/CSV)

---

## Project impact

### For Teams

- **Censorship Resistance:** Operate in restricted environments without fear of platform shutdowns
- **Data Ownership:** Full control over project data (no vendor lock-in)
- **Accessibility:** Low-cost, low-resource solution (runs on Raspberry Pi or old laptops)
- **Privacy:** No tracking, ads, or data mining

### For the Nostr Ecosystem

- **Utility Expansion:** Demonstrates Nostr's potential beyond social media (productivity tools)
- **Developer Onboarding:** Provides a practical use case for developers exploring Nostr
- **Community Growth:** Attracts project managers and non-technical users to Nostr

### Broader Implications

- **Open Source Contribution:** Code will be MIT-licensed, fostering community-driven improvements
- **Decentralized Workflows:** Paves the way for other Nostr-based collaboration tools (e.g., docs, wikis)
- **Global Accessibility:** Empowers teams in regions with internet restrictions or limited infrastructure


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
cd nostrtrack
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
