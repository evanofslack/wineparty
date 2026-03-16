package repository

import "wineparty/internal/game"

type Repository interface {
	GetState() *game.GameState
	SaveState() error
}
