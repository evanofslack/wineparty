package repository

import (
	"encoding/json"
	"log/slog"
	"os"
	"sync"

	"wineparty/internal/game"
)

type MemoryRepo struct {
	mu        sync.RWMutex
	state     *game.GameState
	stateFile string
}

func NewMemoryRepo(wines []game.WineConfig, stateFile string) *MemoryRepo {
	r := &MemoryRepo{
		stateFile: stateFile,
	}
	if loaded := r.loadSnapshot(stateFile); loaded != nil {
		r.state = loaded
	} else {
		r.state = game.NewGameState(wines)
	}
	return r
}

func (r *MemoryRepo) GetState() *game.GameState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.state
}

func (r *MemoryRepo) SaveState() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	data, err := json.MarshalIndent(r.state, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(r.stateFile, data, 0644); err != nil {
		slog.Warn("failed to save state snapshot", "err", err)
		return err
	}
	return nil
}

func (r *MemoryRepo) loadSnapshot(path string) *game.GameState {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var s game.GameState
	if err := json.Unmarshal(data, &s); err != nil {
		slog.Warn("failed to load state snapshot", "err", err)
		return nil
	}
	if s.Players == nil {
		s.Players = make(map[string]*game.Player)
	}
	slog.Info("loaded state snapshot", "path", path, "phase", s.Phase)
	return &s
}
