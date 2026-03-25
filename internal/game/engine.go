package game

import (
	"errors"
	"sort"
	"strings"
	"time"
)

var (
	ErrWrongPhase        = errors.New("action not allowed in current phase")
	ErrAlreadyExists     = errors.New("player already exists")
	ErrNotFound          = errors.New("player not found")
	ErrAlreadySubmitted  = errors.New("guess already submitted")
	ErrTooManyFlavors    = errors.New("too many flavor notes (max 3)")
	ErrAlreadyAnswered   = errors.New("already answered")
	ErrInvalidAnswer     = errors.New("invalid answer")
	ErrMaxGuessesReached = errors.New("max guesses reached")
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

func (e *Engine) AddPlayer(id, name, color, avatar string, role Role) (*Player, error) {
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
		Color:     color,
		Avatar:    avatar,
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

	var minYear, maxYear int
	var minPrice, maxPrice int
	for _, r := range e.state.Rounds {
		if r.Wine.Year > 0 {
			if minYear == 0 || r.Wine.Year < minYear {
				minYear = r.Wine.Year
			}
			if r.Wine.Year > maxYear {
				maxYear = r.Wine.Year
			}
		}
		if r.Wine.Price > 0 {
			if minPrice == 0 || r.Wine.Price < minPrice {
				minPrice = r.Wine.Price
			}
			if r.Wine.Price > maxPrice {
				maxPrice = r.Wine.Price
			}
		}
	}
	yearRange := maxYear - minYear
	yearTier1 := yearRange / 6
	if yearTier1 < 1 {
		yearTier1 = 1
	}
	yearTier2 := yearRange / 3
	if yearTier2 < 1 {
		yearTier2 = 1
	}
	priceRange := maxPrice - minPrice
	priceTier1 := priceRange / 6
	if priceTier1 < 1 {
		priceTier1 = 1
	}
	priceTier2 := priceRange / 3
	if priceTier2 < 1 {
		priceTier2 = 1
	}

	for _, g := range round.Guesses {
		rs := ScoreGuess(g, round.Wine, yearTier1, yearTier2, priceTier1, priceTier2)
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
	for i, schedRound := range e.state.MiniGameSchedule {
		if schedRound == e.state.CurrentRound && i < len(e.state.MiniGameConfigs) {
			e.state.MiniGame = initMiniGame(e.state.MiniGameConfigs[i])
			e.state.Phase = PhaseMiniGame
			return nil
		}
	}
	e.state.CurrentRound = next
	e.state.Phase = PhaseGuessing
	return nil
}

func (e *Engine) EndMiniGame() error {
	if e.state.Phase != PhaseMiniGame {
		return ErrWrongPhase
	}
	e.state.Phase = PhaseMiniGameResults
	return nil
}

func (e *Engine) EndMiniGameResults() error {
	if e.state.Phase != PhaseMiniGameResults {
		return ErrWrongPhase
	}
	e.state.MiniGame = nil
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

func (e *Engine) MiniGameNextQuestion() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	if e.state.MiniGame.Config.Type != "trivia" {
		return ErrWrongPhase
	}
	e.state.MiniGame.CurrentQuestion++
	e.state.MiniGame.AnswerRevealed = false
	return nil
}

func (e *Engine) MiniGameRevealAnswer() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	if e.state.MiniGame.Config.Type != "trivia" {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	ms.AnswerRevealed = true
	q := ms.CurrentQuestion
	if q < len(ms.Config.Questions) {
		question := ms.Config.Questions[q]
		for playerID, ps := range ms.TriviaStates {
			if q >= len(ps.Answers) || ps.Answers[q] == -1 {
				continue
			}
			idx := ps.Answers[q]
			if idx >= 0 && idx < len(question.Options) {
				if strings.EqualFold(strings.TrimSpace(question.Options[idx]), strings.TrimSpace(question.Answer)) {
					ps.Points += question.Points
					if p, ok := e.state.Players[playerID]; ok {
						p.MiniGameScore += question.Points
					}
				}
			}
		}
		e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	}
	return nil
}

func (e *Engine) SubmitMiniGameAnswer(playerID string, ans MiniGameAnswer) error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	switch e.state.MiniGame.Config.Type {
	case "wordle":
		return e.submitWordleGuess(playerID, ans.WordleGuess)
	case "connections":
		return e.submitConnectionsGroup(playerID, ans.ConnGroup)
	case "trivia":
		return e.submitTriviaAnswer(playerID, ans.TriviaAnswerIndex)
	default:
		return ErrInvalidAnswer
	}
}

func (e *Engine) submitWordleGuess(playerID, guess string) error {
	ms := e.state.MiniGame
	guess = strings.ToUpper(strings.TrimSpace(guess))
	word := strings.ToUpper(ms.Config.Word)
	if len(guess) != len(word) {
		return ErrInvalidAnswer
	}
	maxGuesses := ms.Config.MaxGuesses
	if maxGuesses <= 0 {
		maxGuesses = 6
	}
	if ms.WordleStates == nil {
		ms.WordleStates = make(map[string]*PlayerWordleState)
	}
	ps := ms.WordleStates[playerID]
	if ps == nil {
		ps = &PlayerWordleState{Guesses: []WordleGuessResult{}}
		ms.WordleStates[playerID] = ps
	}
	if ps.Solved || len(ps.Guesses) >= maxGuesses {
		return ErrAlreadyAnswered
	}
	states := wordleLetterStates(guess, word)
	ps.Guesses = append(ps.Guesses, WordleGuessResult{Word: guess, States: states})
	if guess == word {
		ps.Solved = true
		guessCount := len(ps.Guesses)
		ps.Points = (maxGuesses - guessCount + 1) * 2
		if p, ok := e.state.Players[playerID]; ok {
			p.MiniGameScore += ps.Points
		}
		e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	}
	return nil
}

func (e *Engine) submitConnectionsGroup(playerID string, group []string) error {
	ms := e.state.MiniGame
	if len(group) != 4 {
		return ErrInvalidAnswer
	}
	if ms.ConnStates == nil {
		ms.ConnStates = make(map[string]*PlayerConnectionsState)
	}
	ps := ms.ConnStates[playerID]
	if ps == nil {
		ps = &PlayerConnectionsState{FoundGroups: []string{}}
		ms.ConnStates[playerID] = ps
	}
	if ps.TotalGuesses >= 5 {
		return ErrMaxGuessesReached
	}
	ps.TotalGuesses++
	normalized := make([]string, len(group))
	for i, w := range group {
		normalized[i] = strings.ToLower(strings.TrimSpace(w))
	}
	sort.Strings(normalized)
	for _, g := range ms.Config.Groups {
		words := make([]string, len(g.Words))
		for i, w := range g.Words {
			words[i] = strings.ToLower(strings.TrimSpace(w))
		}
		sort.Strings(words)
		if strSlicesEqual(normalized, words) {
			for _, found := range ps.FoundGroups {
				if found == g.Category {
					return ErrAlreadyAnswered
				}
			}
			pts := colorPoints(g.Color)
			ps.FoundGroups = append(ps.FoundGroups, g.Category)
			ps.Points += pts
			if p, ok := e.state.Players[playerID]; ok {
				p.MiniGameScore += pts
			}
			e.state.Leaderboard = BuildLeaderboard(e.state.Players)
			return nil
		}
	}
	ps.IncorrectGuesses++
	return ErrInvalidAnswer
}

func (e *Engine) submitTriviaAnswer(playerID string, answerIndex int) error {
	ms := e.state.MiniGame
	q := ms.CurrentQuestion
	if q >= len(ms.Config.Questions) {
		return ErrWrongPhase
	}
	if ms.TriviaStates == nil {
		ms.TriviaStates = make(map[string]*PlayerTriviaState)
	}
	ps := ms.TriviaStates[playerID]
	if ps == nil {
		ps = &PlayerTriviaState{Answers: make([]int, len(ms.Config.Questions))}
		for i := range ps.Answers {
			ps.Answers[i] = -1
		}
		ms.TriviaStates[playerID] = ps
	}
	if q >= len(ps.Answers) {
		extra := make([]int, q+1-len(ps.Answers))
		for i := range extra {
			extra[i] = -1
		}
		ps.Answers = append(ps.Answers, extra...)
	}
	if ps.Answers[q] != -1 {
		return ErrAlreadyAnswered
	}
	ps.Answers[q] = answerIndex
	return nil
}

func wordleLetterStates(guess, word string) []WordleLetterState {
	n := len(word)
	states := make([]WordleLetterState, n)
	remaining := make(map[rune]int)
	for i, ch := range word {
		if rune(guess[i]) != ch {
			remaining[ch]++
		}
	}
	for i, ch := range word {
		if rune(guess[i]) == ch {
			states[i] = LetterCorrect
		}
	}
	for i := range n {
		if states[i] == LetterCorrect {
			continue
		}
		ch := rune(guess[i])
		if remaining[ch] > 0 {
			states[i] = LetterPresent
			remaining[ch]--
		} else {
			states[i] = LetterAbsent
		}
	}
	return states
}

func strSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func colorPoints(color string) int {
	switch strings.ToLower(color) {
	case "yellow":
		return 1
	case "green":
		return 2
	case "blue":
		return 3
	case "purple":
		return 4
	default:
		return 1
	}
}

func initMiniGame(cfg MiniGameConfig) *MiniGameState {
	ms := &MiniGameState{
		Config:          cfg,
		CurrentQuestion: 0,
	}
	switch cfg.Type {
	case "wordle":
		ms.WordleStates = make(map[string]*PlayerWordleState)
	case "connections":
		ms.ConnStates = make(map[string]*PlayerConnectionsState)
	case "trivia":
		ms.TriviaStates = make(map[string]*PlayerTriviaState)
	}
	return ms
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

func (e *Engine) SetTimer(durationSecs int) {
	e.state.Timer = &TimerState{
		DurationSecs: durationSecs,
	}
}

func (e *Engine) StartTimer() error {
	if e.state.Timer == nil || e.state.Timer.DurationSecs == 0 {
		return errors.New("timer not set")
	}
	if e.state.Timer.Running {
		return nil
	}
	now := time.Now()
	e.state.Timer.StartedAt = &now
	e.state.Timer.Running = true
	return nil
}

func (e *Engine) PauseTimer() {
	if e.state.Timer == nil || !e.state.Timer.Running {
		return
	}
	if e.state.Timer.StartedAt != nil {
		e.state.Timer.ElapsedSecs += int(time.Since(*e.state.Timer.StartedAt).Seconds())
		e.state.Timer.StartedAt = nil
	}
	e.state.Timer.Running = false
}

func (e *Engine) ResetTimer() {
	if e.state.Timer == nil {
		return
	}
	e.state.Timer.ElapsedSecs = 0
	e.state.Timer.StartedAt = nil
	e.state.Timer.Running = false
}

func (e *Engine) ClearTimer() {
	e.state.Timer = nil
}

func (e *Engine) ResetToLobby(wines []WineConfig) {
	*e.state = *NewGameState(wines)
}
