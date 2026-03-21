# wineparty

Real time multiplayer wine blind tasting game powered by go, react, and websockets

## getting started

Run from the prebuilt container with a `docker-compose.yaml`:

```yaml
services:
  wineparty:
    image: evanofslack/wineparty:latest
    container_name: wineparty
    restart: unless-stopped
    ports:
      - 8080:8080
    environment:
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      WINES_FILE: /app/config/wines.yaml
    volumes:
      - ./config/wines.yaml:/app/config/wines.yaml
```

## development

```bash
just dev        # run backend + frontend concurrently
just build      # build production binary
just test       # go test ./...
```
