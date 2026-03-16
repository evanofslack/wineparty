# Wine Party — task runner
# Primary: direct go run + npm run dev
# Secondary: Docker Compose (just dev-docker)

set dotenv-load

default:
    just --list

# Start backend (direct, no docker)
backend:
    go run ./...

# Start frontend dev server (direct, no docker)
frontend:
    cd web && npm run dev

# Run both backend and frontend concurrently (requires process-runner or two terminals)
dev:
    #!/usr/bin/env bash
    trap 'kill %1 %2 2>/dev/null' EXIT
    go run . &
    cd web && npm run dev &
    wait

# Run Go tests
test:
    go test ./...

# Run Go tests verbose
test-v:
    go test -v ./...

# Build production binary (frontend first, then Go with embed)
build:
    cd web && npm run build
    go build -o wineparty .

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
