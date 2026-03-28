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
			Country: w.Country,
			Region:  w.Region,
			Year:    w.Year,
			Hint:    w.Hint,
			Flavors: w.Flavors,
			Price:   w.Price,
		}
	}

	miniGameConfigs := make([]game.MiniGameConfig, len(cfg.Games))
	for i, g := range cfg.Games {
		groups := make([]game.ConnectionsGroup, len(g.Groups))
		for j, gr := range g.Groups {
			groups[j] = game.ConnectionsGroup{
				Category: gr.Category,
				Color:    gr.Color,
				Words:    gr.Words,
			}
		}
		questions := make([]game.TriviaQuestion, len(g.Questions))
		for j, q := range g.Questions {
			questions[j] = game.TriviaQuestion{
				Text:    q.Text,
				Options: q.Options,
				Answer:  q.Answer,
				Points:  q.Points,
			}
		}
		fibbageQs := make([]game.FibbageQuestion, len(g.FibbageQuestions))
		for j, q := range g.FibbageQuestions {
			fibbageQs[j] = game.FibbageQuestion{Prompt: q.Prompt, Answer: q.Answer}
		}
		emojiRounds := make([]game.EmojiRound, len(g.EmojiRounds))
		for j, r := range g.EmojiRounds {
			emojiRounds[j] = game.EmojiRound{Emoji: r.Emoji, Answer: r.Answer}
		}
		miniGameConfigs[i] = game.MiniGameConfig{
			Type:             g.Type,
			Word:             g.Word,
			MaxGuesses:       g.MaxGuesses,
			Groups:           groups,
			Questions:        questions,
			FibbageQuestions: fibbageQs,
			MaxRounds:        g.MaxRounds,
			Prompts:          g.Prompts,
			TimerSeconds:     g.TimerSeconds,
			EmojiRounds:      emojiRounds,
		}
	}

	miniGameSchedule := computeMiniGameSchedule(len(wines), len(miniGameConfigs))

	playerColors := make([]game.PlayerColor, len(cfg.Colors))
	for i, c := range cfg.Colors {
		playerColors[i] = game.PlayerColor{Name: c.Name, Hex: c.Hex}
	}

	repo := repository.NewMemoryRepo(wines, cfg.StateFile)
	state := repo.GetState()
	if state.MiniGameSchedule == nil {
		state.MiniGameSchedule = miniGameSchedule
		state.MiniGameConfigs = miniGameConfigs
	}
	state.Colors = playerColors

	eng := game.NewEngine(state)
	hub := ws.NewHub(repo, eng, cfg.AdminPassword, wines, playerColors, cfg.LogDir, miniGameSchedule, miniGameConfigs)
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

func computeMiniGameSchedule(numRounds, numGames int) []int {
	if numRounds <= 1 || numGames == 0 {
		return nil
	}
	effective := numGames
	if effective > numRounds-1 {
		effective = numRounds - 1
	}
	spacing := numRounds / effective
	cap := numRounds - 2
	schedule := make([]int, effective)
	for i := range effective {
		s := spacing*(i+1) - 1
		if s > cap {
			s = cap
		}
		schedule[i] = s
	}
	return schedule
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
