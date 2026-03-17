package game

import (
	"errors"
	"time"
)

var (
	ErrWrongPhase    = errors.New("action not allowed in current phase")
	ErrAlreadyExists = errors.New("player already exists")
	ErrNotFound      = errors.New("player not found")
	ErrAlreadySubmitted = errors.New("guess already submitted")
	ErrTooManyFlavors = errors.New("too many flavor notes (max 3)")
)

type Engine struct {
	state *GameState
}

func NewEngine(state *GameState) *Engine {
	return &Engine{state: state}
}

func (e *Engine) State() *GameState {
	return e.state
}

func (e *Engine) AddPlayer(id, name string, role Role) (*Player, error) {
	if p, exists := e.state.Players[id]; exists {
		p.Connected = true
		if name != "" {
			p.Name = name
		}
		if role != RolePlayer {
			p.Role = role
		}
		return p, nil
	}
	p := &Player{
		ID:        id,
		Name:      name,
		Role:      role,
		Connected: true,
		JoinedAt:  time.Now(),
	}
	e.state.Players[id] = p
	return p, nil
}

func (e *Engine) SetPlayerDisconnected(id string) {
	if p, ok := e.state.Players[id]; ok {
		p.Connected = false
	}
}

func (e *Engine) StartGame() error {
	if e.state.Phase != PhaseLobby {
		return ErrWrongPhase
	}
	if len(e.state.Rounds) == 0 {
		return errors.New("no rounds configured")
	}
	now := time.Now()
	e.state.StartedAt = &now
	e.state.Phase = PhaseGuessing
	e.state.CurrentRound = 0
	return nil
}

func (e *Engine) SubmitGuess(guess Guess) error {
	if e.state.Phase != PhaseGuessing {
		return ErrWrongPhase
	}
	if len(guess.Flavors) > 3 {
		return ErrTooManyFlavors
	}
	round := &e.state.Rounds[e.state.CurrentRound]
	for _, g := range round.Guesses {
		if g.PlayerID == guess.PlayerID {
			return ErrAlreadySubmitted
		}
	}
	guess.RoundIndex = e.state.CurrentRound
	guess.SubmittedAt = time.Now()
	round.Guesses = append(round.Guesses, guess)
	return nil
}

func (e *Engine) CloseGuessing() error {
	if e.state.Phase != PhaseGuessing {
		return ErrWrongPhase
	}
	e.state.Phase = PhaseScoring
	round := &e.state.Rounds[e.state.CurrentRound]
	now := time.Now()
	round.RevealedAt = &now

	for _, g := range round.Guesses {
		rs := ScoreGuess(g, round.Wine)
		round.Scores = append(round.Scores, rs)
		if p, ok := e.state.Players[g.PlayerID]; ok {
			p.TotalScore += rs.Points
		}
	}
	e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	return nil
}

func (e *Engine) NextRound() error {
	if e.state.Phase != PhaseScoring {
		return ErrWrongPhase
	}
	next := e.state.CurrentRound + 1
	if next >= len(e.state.Rounds) {
		now := time.Now()
		e.state.CompletedAt = &now
		e.state.Phase = PhaseComplete
		summary, playerSummaries := computeSummary(e.state)
		e.state.Summary = summary
		e.state.PlayerSummaries = playerSummaries
		return nil
	}
	e.state.CurrentRound = next
	e.state.Phase = PhaseGuessing
	return nil
}

func (e *Engine) SetPlayerScore(playerID string, score int) error {
	p, ok := e.state.Players[playerID]
	if !ok {
		return ErrNotFound
	}
	p.TotalScore = score
	e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	return nil
}

func (e *Engine) ResetToLobby(wines []WineConfig) {
	*e.state = *NewGameState(wines)
}
