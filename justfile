# Wine Party — task runner
# Primary: direct go run + npm run dev
# Secondary: Docker Compose (just dev-docker)

set dotenv-load

default:
    just --list

# Start backend server
backend:
    go run ./cmd/server

# Start frontend dev server
frontend:
    cd web && npm run dev

# Run backend and frontend concurrently
dev:
    #!/usr/bin/env bash
    trap 'kill %1 %2 2>/dev/null' EXIT
    go run ./cmd/server &
    cd web && npm run dev &
    wait

# Run bot simulation (pass flags after --)
# Example: just bot -- --players 4 --strategy correct --loglevel debug
bot *args='':
    go run ./cmd/simbot {{args}}

# Run Go tests
test:
    go test ./...

# Run Go tests verbose
test-v:
    go test -v ./...

# Build production binary (frontend first, then Go with embed)
build:
    cd web && npm run build
    go build -o wineparty ./cmd/server

# Build and run production binary
run: build
    ./wineparty

# Start containerized dev environment (secondary)
dev-docker:
    docker compose up --build

# Stop docker dev environment
stop-docker:
    docker compose down

# Clean build artifacts
clean:
    rm -f wineparty state.json
    rm -rf web/dist
