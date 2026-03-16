package config

import (
	"flag"
	"log/slog"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Wine struct {
	ID      int    `yaml:"id"`
	Name    string `yaml:"name"`
	Variety string `yaml:"variety"`
	Region  string `yaml:"region"`
	Year    int    `yaml:"year"`
	Hint    string `yaml:"hint"`
}

type WinesFile struct {
	Wines []Wine `yaml:"wines"`
}

type Config struct {
	Port          string
	AdminPassword string
	WinesFile     string
	StateFile     string
	Wines         []Wine
}

func Load() *Config {
	port := flag.String("port", envOr("PORT", "8080"), "HTTP port")
	adminPass := flag.String("admin-password", envOr("ADMIN_PASSWORD", "wine123"), "Admin password")
	winesFile := flag.String("wines-file", envOr("WINES_FILE", "config/wines.yaml"), "Path to wines YAML")
	stateFile := flag.String("state-file", envOr("STATE_FILE", "state.json"), "Path to state snapshot file")
	flag.Parse()

	cfg := &Config{
		Port:          *port,
		AdminPassword: *adminPass,
		WinesFile:     *winesFile,
		StateFile:     *stateFile,
	}

	data, err := os.ReadFile(cfg.WinesFile)
	if err != nil {
		slog.Warn("could not read wines file", "path", cfg.WinesFile, "err", err)
		return cfg
	}
	var wf WinesFile
	if err := yaml.Unmarshal(data, &wf); err != nil {
		slog.Warn("could not parse wines file", "err", err)
		return cfg
	}
	cfg.Wines = wf.Wines
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
