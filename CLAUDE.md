# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
just dev          # Run backend + frontend concurrently (local dev)
just backend      # Run backend only
just frontend     # Run frontend only (cd web && npm run dev)
just build        # Build production binary (embeds frontend dist)
just run          # Build then execute the binary
just test         # go test ./...
just test-v       # go test -v ./...
just dev-docker   # Docker Compose (backend + frontend as services)
just clean        # Remove build artifacts
```

Running a single Go test:
```bash
go test ./internal/game/... -run TestName
```

## Architecture

The app is a real-time multiplayer wine blind tasting game. A Go backend serves a React SPA; all game state flows through WebSocket messages.

**Game phases:** `Lobby → Guessing → Scoring → [Complete or next round]`

### Backend (`internal/`)

| Package | Role |
|---|---|
| `game` | Pure game logic — state structs, engine (state machine), scoring. No I/O. |
| `ws` | WebSocket hub + client pumps. Hub owns goroutines/channels; routes inbound messages to engine. |
| `repository` | Interface + in-memory impl. Persists `GameState` as JSON snapshot to `state.json`. |
| `handlers` | HTTP handler that upgrades connections to WebSocket. |
| `config` | Loads config from flags → env → defaults. Parses `wines.yaml`. |

**Data flow:** client sends `{type, payload}` → hub routes → engine mutates state → repo saves → hub broadcasts full `GameState` to all clients.

Concurrency: hub channels (`register`, `unregister`, `inbound`, `broadcast`) + mutex-protected repo. Client read/write pumps are separate goroutines with ping/pong keepalive (~54s interval).

Sentinel errors (`ErrWrongPhase`, `ErrAlreadySubmitted`, etc.) are returned as error envelopes to the client — never panic.

### Frontend (`web/src/`)

Three views via React Router: `/` (player), `/display` (big-screen/TV mode), `/admin` (auth + control panel).

State management: `useReducer` + React context (`gameStore.ts`). `useGameSocket` hook manages the WebSocket connection with 2s auto-reconnect. `useIdentity` persists player ID/name to localStorage.

**TypeScript types in `web/src/types/game.ts` mirror Go structs exactly — keep them in sync when changing `internal/game/state.go`.**

### Message protocol

Message types are numeric enums (`MessageType`, `AdminActionType` in `internal/ws/messages.go` and `web/src/types/game.ts`). **Never reorder — append only** to preserve wire compatibility.

### Configuration

Priority: CLI flags > env vars > defaults.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP listen port |
| `ADMIN_PASSWORD` | `wine123` | Admin panel auth |
| `WINES_FILE` | `config/wines.yaml` | Wine list with answers |
| `STATE_FILE` | `state.json` | JSON snapshot path |

### Production build

`Dockerfile.backend` is multi-stage: builds frontend, then embeds `web/dist/` into the Go binary via `embed.go`. The final binary is self-contained (no separate static file serving needed).

### Scoring

- Variety match: 3 pts
- Region match: 2 pts
- Year exact: 3 pts, ±1: 2 pts, ±2: 1 pt
- Each flavor note (max 3): 1 pt each
- String comparisons are case-insensitive and trimmed
- Leaderboard excludes players with `admin` role
