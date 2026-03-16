package main

import (
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"wineparty/internal/config"
	"wineparty/internal/game"
	"wineparty/internal/handlers"
	"wineparty/internal/repository"
	"wineparty/internal/ws"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg := config.Load()

	wines := make([]game.WineConfig, len(cfg.Wines))
	for i, w := range cfg.Wines {
		wines[i] = game.WineConfig{
			ID:      w.ID,
			Name:    w.Name,
			Variety: w.Variety,
			Region:  w.Region,
			Year:    w.Year,
			Hint:    w.Hint,
		}
	}

	repo := repository.NewMemoryRepo(wines, cfg.StateFile)
	eng := game.NewEngine(repo.GetState())
	hub := ws.NewHub(repo, eng, cfg.AdminPassword, wines)
	go hub.Run()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/ws", handlers.WSHandler(hub))
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// SPA handler: serve static assets directly, fall back to index.html for routes
	fsys := getFrontendFS()
	r.Handle("/*", spaHandler(fsys))

	slog.Info("starting wineparty server", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}

func spaHandler(fsys http.FileSystem) http.Handler {
	fileServer := http.FileServer(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to open the requested path
		f, err := fsys.Open(r.URL.Path)
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}
		// For paths without a file extension, serve index.html (SPA routing)
		if !strings.Contains(r.URL.Path, ".") {
			r2 := *r
			r2.URL.Path = "/"
			fileServer.ServeHTTP(w, &r2)
			return
		}
		http.NotFound(w, r)
	})
}
