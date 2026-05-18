# SketchStrike

A realtime multiplayer drawing-and-guessing game built around one twist: **every player has a limited number of guesses per round**. Run out, and you're locked out for the rest of the round. Spamming guesses is no longer free.

This is the **MVP vertical slice** — a playable end-to-end build with monorepo scaffolding, the realtime engine, and the limited-guess mechanic. Persistence (Postgres/Prisma), Redis, JWT auth, tests, sound, and deployment configs are intentionally deferred to follow-up passes.

## Tech stack (this slice)

| Layer | Tooling |
|------|---------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand, Konva.js / react-konva, Framer Motion, socket.io-client |
| Backend | Node.js 20+, Express, Socket.IO, TypeScript (in-memory state) |
| Shared | Typed event contract + game constants in `packages/shared` |
| Tooling | TurboRepo, npm workspaces, strict TS |

## Repository layout

```
sketchstrike/
├── apps/
│   ├── server/                  # Express + Socket.IO authoritative game server
│   │   └── src/
│   │       ├── game/            # RoomManager, GameLoop, Scoring, WordBank, GuessValidator
│   │       ├── socket/          # Socket.IO event handlers
│   │       └── utils/           # id, normalize, levenshtein
│   └── web/                     # Next.js client
│       └── src/
│           ├── app/             # / and /room/[code]
│           ├── components/      # DrawingCanvas, ChatPanel, Lobby, GameScreen, ...
│           ├── store/           # Zustand store
│           └── lib/             # socket, bindSocket, session
└── packages/
    └── shared/                  # Cross-package types, events, constants
```

## Setup

Prerequisite: **Node.js 20+**, npm 10+.

```bash
# from the repo root
npm install

# copy env templates
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local
```

## Run

Two terminals (or `turbo dev` which runs both):

```bash
# terminal 1 — backend on :4000
npm run dev:server

# terminal 2 — frontend on :3000
npm run dev:web
```

Then open <http://localhost:3000>, create a room, share the 5-character code, and have a second browser/tab join.

## Deployment notes

Deploy the Next.js frontend to Vercel if you like, but run `apps/server` on an always-on Node host that supports persistent WebSocket connections, such as Railway, Render, Fly.io, a VPS, or a container service. Vercel Functions cannot act as the Socket.IO server for this app because rooms, timers, reconnect windows, and drawing events live in server memory over a long-lived connection.

Set the production frontend environment variable to the deployed server URL:

```bash
NEXT_PUBLIC_SERVER_URL=https://your-always-on-node-server.example.com
```

Set the server CORS origin to the deployed frontend domain. Multiple domains can be comma-separated, which is useful for a production Vercel domain plus a custom domain:

```bash
CORS_ORIGIN=https://sketch-strike-web.vercel.app,https://your-custom-domain.com
```

For Render, use the repository root as the service root when possible:

```bash
Build Command: npm install; npm run build
Start Command: npm run start --workspace=@sketchstrike/server
```

If the Render service root is set to `apps/server`, use:

```bash
Build Command: npm install; npm run build --workspace=@sketchstrike/shared; npm run build
Start Command: npm run start
```

## How the game works

1. **Lobby** — host configures mode, rounds, round timer, **guesses per round**, hints.
2. **Choose word** — current drawer picks one of three options (or one is picked for them after 15s).
3. **Round** — drawer draws on canvas, other players type guesses.
   - Correct guess → score awarded, player flagged correct (does NOT cost a guess).
   - Wrong guess in **Strike mode** → consumes one of the player's guesses.
   - Reaching 0 guesses → player is **locked out** for the rest of the round.
   - Round ends when timer hits 0, everyone has guessed correctly, or everyone is locked.
4. **Round summary** → points awarded → next drawer.
5. After everyone has drawn for all rounds, the **game over** screen shows final rankings and a rematch button (host only).

### Scoring (server-authoritative)

- **Guesser** = `200 + speedBonus(0–600) + rankBonus(0–200) + strikeBonus(0–200)` — the `strikeBonus` rewards guessing without burning attempts.
- **Drawer** = `150 + 450 × (correctGuessers / totalGuessers)` — drawing rewards engagement, not just one quick correct guess.

### Realtime contract

All client/server events are typed end-to-end via `@sketchstrike/shared`. The server is fully authoritative: it owns timers, the secret word, lockout state, and scoring. Clients only emit intent (draw stroke, guess text, chosen word) and render state pushed by the server.

Draw events are transmitted as **normalized point arrays** — never image data — so the canvas scales cleanly across devices.

## Key design choices

- **Strokes are normalized** (0–1) on the wire and scaled per client on render — phones and desktops see the same drawing at the right size.
- **In-memory rooms** with a 30-second reconnect grace window — refresh-safe inside the grace period.
- **Close-guess feedback is private** — only the guesser sees "you were close!" so it can't be used to leak the word.
- **Word-choice timeout** — if the drawer doesn't pick in 15s, a random choice from their three is selected, so the game never stalls.

## Deferred (follow-up passes)

- Persistence: Prisma + Postgres for users, stats, match history.
- Redis adapter for Socket.IO so we can horizontally scale the server.
- JWT auth + optional accounts (guest play already works via local-storage tokens).
- Docker / CI / deployment configs.
- Sound effects, deeper Framer Motion polish.
- Vitest unit + Playwright integration tests.
- Profanity filter, AI moderation.

## Scripts

```bash
npm run dev          # turbo run dev (both apps)
npm run build        # build all packages
npm run typecheck    # tsc --noEmit across the monorepo
npm run dev:web      # only frontend
npm run dev:server   # only backend
```
