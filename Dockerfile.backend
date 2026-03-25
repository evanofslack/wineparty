FROM node:20-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM golang:1.22-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -o wineparty .

FROM alpine:3.19
WORKDIR /app
COPY --from=backend /app/wineparty .
EXPOSE 8080
CMD ["./wineparty"]
