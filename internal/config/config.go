package config

import (
	"flag"
	"log/slog"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Wine struct {
	ID      int      `yaml:"id"`
	Name    string   `yaml:"name"`
	Variety string   `yaml:"variety"`
	Country string   `yaml:"country"`
	Region  string   `yaml:"region"`
	Year    int      `yaml:"year"`
	Hint    string   `yaml:"hint"`
	Flavors []string `yaml:"flavors"`
	Price   int      `yaml:"price"`
}

type WinesFile struct {
	Wines []Wine `yaml:"wines"`
}

type ConnectionsGroup struct {
	Category string   `yaml:"category"`
	Color    string   `yaml:"color"`
	Words    []string `yaml:"words"`
}

type TriviaQuestion struct {
	Text    string   `yaml:"text"`
	Options []string `yaml:"options"`
	Answer  string   `yaml:"answer"`
	Points  int      `yaml:"points"`
}

type FibbageQuestion struct {
	Prompt string `yaml:"prompt"`
	Answer string `yaml:"answer"`
}

type EmojiRound struct {
	Emoji  string `yaml:"emoji"`
	Answer string `yaml:"answer"`
}

type GameConfig struct {
	Type             string             `yaml:"type"`
	Word             string             `yaml:"word,omitempty"`
	MaxGuesses       int                `yaml:"max_guesses,omitempty"`
	Groups           []ConnectionsGroup `yaml:"groups,omitempty"`
	Questions        []TriviaQuestion   `yaml:"questions,omitempty"`
	FibbageQuestions []FibbageQuestion  `yaml:"fibbage_questions,omitempty"`
	MaxRounds        int                `yaml:"max_rounds,omitempty"`
	Prompts          []string           `yaml:"prompts,omitempty"`
	TimerSeconds     int                `yaml:"timer_seconds,omitempty"`
	EmojiRounds      []EmojiRound       `yaml:"emoji_rounds,omitempty"`
}

type GamesFile struct {
	Games []GameConfig `yaml:"games"`
}

type PlayerColor struct {
	Name string `yaml:"name"`
	Hex  string `yaml:"hex"`
}

type ColorsFile struct {
	Colors []PlayerColor `yaml:"colors"`
}

type Config struct {
	Port          string
	AdminPassword string
	WinesFile     string
	GamesFile     string
	ColorsFile    string
	StateFile     string
	LogDir        string
	Wines         []Wine
	Games         []GameConfig
	Colors        []PlayerColor
}

func Load() *Config {
	port := flag.String("port", envOr("PORT", "8080"), "HTTP port")
	adminPass := flag.String("admin-password", envOr("ADMIN_PASSWORD", "wine123"), "Admin password")
	winesFile := flag.String("wines-file", envOr("WINES_FILE", "config/wines.yaml"), "Path to wines YAML")
	gamesFile := flag.String("games-file", envOr("GAMES_FILE", "config/games.yaml"), "Path to games YAML")
	colorsFile := flag.String("colors-file", envOr("COLORS_FILE", "config/colors.yaml"), "Path to colors YAML")
	stateFile := flag.String("state-file", envOr("STATE_FILE", "state.json"), "Path to state snapshot file")
	logDir := flag.String("log-dir", envOr("LOG_DIR", "logs"), "Directory for game event logs")
	flag.Parse()

	cfg := &Config{
		Port:          *port,
		AdminPassword: *adminPass,
		WinesFile:     *winesFile,
		GamesFile:     *gamesFile,
		ColorsFile:    *colorsFile,
		StateFile:     *stateFile,
		LogDir:        *logDir,
	}

	wineData, err := os.ReadFile(cfg.WinesFile)
	if err != nil {
		slog.Warn("could not read wines file", "path", cfg.WinesFile, "err", err)
		return cfg
	}
	var wf WinesFile
	if err := yaml.Unmarshal(wineData, &wf); err != nil {
		slog.Warn("could not parse wines file", "err", err)
		return cfg
	}
	cfg.Wines = wf.Wines

	gameData, err := os.ReadFile(cfg.GamesFile)
	if err != nil {
		slog.Warn("could not read games file", "path", cfg.GamesFile, "err", err)
		return cfg
	}
	var gf GamesFile
	if err := yaml.Unmarshal(gameData, &gf); err != nil {
		slog.Warn("could not parse games file", "err", err)
		return cfg
	}
	cfg.Games = gf.Games

	colorData, err := os.ReadFile(cfg.ColorsFile)
	if err != nil {
		slog.Warn("could not read colors file", "path", cfg.ColorsFile, "err", err)
		return cfg
	}
	var cf ColorsFile
	if err := yaml.Unmarshal(colorData, &cf); err != nil {
		slog.Warn("could not parse colors file", "err", err)
		return cfg
	}
	cfg.Colors = cf.Colors
	return cfg
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envIntOr(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

var _ = envIntOr // suppress unused warning
