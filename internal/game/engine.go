package game

import (
	"errors"
	"math"
	"math/rand"
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
	taken := make(map[string]bool)
	for pid, existing := range e.state.Players {
		if pid != id {
			taken[existing.Color] = true
		}
	}
	if taken[color] {
		for _, c := range e.state.Colors {
			if !taken[c.Hex] {
				color = c.Hex
				break
			}
		}
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
	e.state.Phase = PhaseGameIntro
	e.state.CurrentRound = 0
	return nil
}

func (e *Engine) AdvanceIntro() error {
	switch e.state.Phase {
	case PhaseGameIntro:
		e.state.Phase = PhaseTastingIntro
	case PhaseTastingIntro:
		e.state.Phase = PhaseGuessing
	case PhaseMiniGameIntro:
		e.state.Phase = PhaseMiniGame
	default:
		return ErrWrongPhase
	}
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
	e.PauseTimer()
	e.ResetTimer()
	// Check for minigame first so the last round can trigger one before completing.
	for i, schedRound := range e.state.MiniGameSchedule {
		if schedRound == e.state.CurrentRound && i < len(e.state.MiniGameConfigs) {
			e.state.MiniGame = e.initMiniGame(e.state.MiniGameConfigs[i])
			e.state.Phase = PhaseMiniGameIntro
			return nil
		}
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

func (e *Engine) EndMiniGame() error {
	if e.state.Phase != PhaseMiniGame {
		return ErrWrongPhase
	}
	if ms := e.state.MiniGame; ms != nil && ms.Config.Type == "wordle" {
		for playerID, ps := range ms.WordleStates {
			if ps.Points > 0 {
				if p, ok := e.state.Players[playerID]; ok {
					p.MiniGameScore += ps.Points
				}
			}
		}
		e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	}
	if e.state.MiniGame != nil {
		if winners, pts := e.computeMiniGameWinner(); len(winners) > 0 {
			e.state.MiniGameWinners = append(e.state.MiniGameWinners, MiniGameWinner{
				GameType:  e.state.MiniGame.Config.Type,
				WinnerIDs: winners,
				Points:    pts,
			})
		}
		result := MiniGameResult{
			GameType:    e.state.MiniGame.Config.Type,
			PlayerDelta: make(map[string]int),
		}
		for id, p := range e.state.Players {
			if p.Role != RoleAdmin {
				before := e.state.MiniGame.ScoreSnapshot[id]
				result.PlayerDelta[id] = p.MiniGameScore - before
			}
		}
		e.state.MiniGameResults = append(e.state.MiniGameResults, result)
	}
	e.state.Phase = PhaseMiniGameResults
	return nil
}

func (e *Engine) EndMiniGameResults() error {
	if e.state.Phase != PhaseMiniGameResults {
		return ErrWrongPhase
	}
	e.PauseTimer()
	e.ResetTimer()
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
	ms := e.state.MiniGame
	switch ms.Config.Type {
	case "wordle":
		return e.submitWordleGuess(playerID, ans.WordleGuess)
	case "connections":
		return e.submitConnectionsGroup(playerID, ans.ConnGroup)
	case "trivia":
		return e.submitTriviaAnswer(playerID, ans.TriviaAnswerIndex)
	case "fibbage":
		switch ms.SubPhase {
		case "submitting":
			return e.submitFibbageAnswer(playerID, ans.FibbageSubmission)
		case "voting":
			return e.submitFibbageVote(playerID, ans.FibbageVoteSlot)
		}
		return ErrWrongPhase
	case "quiplash":
		switch ms.SubPhase {
		case "submitting":
			return e.submitQuiplashAnswer(playerID, ans.QuiplashSubmission)
		case "voting":
			return e.submitQuiplashVote(playerID, ans.QuiplashVoteSlot)
		}
		return ErrWrongPhase
	case "emoji_decode":
		return e.submitEmojiAnswer(playerID, ans.EmojiAnswer)
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

func (e *Engine) initMiniGame(cfg MiniGameConfig) *MiniGameState {
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
	case "fibbage":
		ms.FibbageStates = make(map[string]*PlayerFibbageState)
		for _, p := range e.state.Players {
			if p.Role != RoleAdmin {
				ms.FibbageStates[p.ID] = &PlayerFibbageState{VotedFor: -1}
			}
		}
		ms.SubPhase = "submitting"
	case "quiplash":
		var playerIDs []string
		for _, p := range e.state.Players {
			if p.Role != RoleAdmin {
				playerIDs = append(playerIDs, p.ID)
			}
		}
		ms.QuiplashMatchups = generateMatchups(playerIDs, cfg.MaxRounds, cfg.Prompts)
		ms.QuiplashStates = make(map[string]*PlayerQuiplashState)
		for _, id := range playerIDs {
			ms.QuiplashStates[id] = &PlayerQuiplashState{
				Submissions: make(map[int]string),
				Votes:       make(map[int]int),
			}
		}
		ms.SubPhase = "submitting"
	case "emoji_decode":
		ms.EmojiStates = make(map[string]*PlayerEmojiState)
		for _, p := range e.state.Players {
			if p.Role != RoleAdmin {
				ms.EmojiStates[p.ID] = &PlayerEmojiState{
					RoundWins: make([]bool, len(cfg.EmojiRounds)),
				}
			}
		}
		now := time.Now()
		ms.RoundStartedAt = &now
		ms.SubPhase = "active"
	}
	ms.ScoreSnapshot = make(map[string]int, len(e.state.Players))
	for id, p := range e.state.Players {
		if p.Role != RoleAdmin {
			ms.ScoreSnapshot[id] = p.MiniGameScore
		}
	}
	return ms
}

func (e *Engine) computeMiniGameWinner() ([]string, int) {
	ms := e.state.MiniGame
	if ms == nil || ms.ScoreSnapshot == nil {
		return nil, 0
	}
	var winners []string
	maxDelta := 0
	for id, p := range e.state.Players {
		if p.Role == RoleAdmin {
			continue
		}
		delta := p.MiniGameScore - ms.ScoreSnapshot[id]
		if delta > maxDelta {
			maxDelta = delta
			winners = []string{id}
		} else if delta == maxDelta && delta > 0 {
			winners = append(winners, id)
		}
	}
	return winners, maxDelta
}

func generateMatchups(playerIDs []string, maxRounds int, prompts []string) []QuiplashMatchup {
	var pairs [][2]string
	for i := 0; i < len(playerIDs); i++ {
		for j := i + 1; j < len(playerIDs); j++ {
			pairs = append(pairs, [2]string{playerIDs[i], playerIDs[j]})
		}
	}
	rand.Shuffle(len(pairs), func(i, j int) { pairs[i], pairs[j] = pairs[j], pairs[i] })
	n := len(pairs)
	if maxRounds > 0 && maxRounds < n {
		n = maxRounds
	}
	if len(prompts) < n {
		n = len(prompts)
	}
	matchups := make([]QuiplashMatchup, n)
	for i := 0; i < n; i++ {
		matchups[i] = QuiplashMatchup{
			PlayerA: pairs[i][0],
			PlayerB: pairs[i][1],
			Prompt:  prompts[i],
		}
	}
	return matchups
}

func (e *Engine) submitFibbageAnswer(playerID, submission string) error {
	ms := e.state.MiniGame
	ps, ok := ms.FibbageStates[playerID]
	if !ok {
		return ErrInvalidAnswer
	}
	if ps.Submission != "" {
		return ErrAlreadyAnswered
	}
	q := ms.Config.FibbageQuestions[ms.CurrentQuestion]
	if strings.EqualFold(strings.TrimSpace(submission), strings.TrimSpace(q.Answer)) {
		return ErrInvalidAnswer
	}
	ps.Submission = strings.TrimSpace(submission)
	return nil
}

func (e *Engine) submitFibbageVote(playerID string, slotID int) error {
	ms := e.state.MiniGame
	ps, ok := ms.FibbageStates[playerID]
	if !ok {
		return ErrInvalidAnswer
	}
	if ps.VotedFor != -1 {
		return ErrAlreadyAnswered
	}
	if slotID < 0 || slotID >= len(ms.FibbageSlots) {
		return ErrInvalidAnswer
	}
	// prevent voting for own submission
	slot := ms.FibbageSlots[slotID]
	if strings.EqualFold(strings.TrimSpace(slot.Text), strings.TrimSpace(ps.Submission)) && ps.Submission != "" {
		return ErrInvalidAnswer
	}
	ps.VotedFor = slotID
	return nil
}

func (e *Engine) FibbageStartVoting() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "fibbage" || ms.SubPhase != "submitting" {
		return ErrWrongPhase
	}
	q := ms.Config.FibbageQuestions[ms.CurrentQuestion]
	var slots []FibbageSlot
	for _, ps := range ms.FibbageStates {
		if ps.Submission != "" {
			slots = append(slots, FibbageSlot{Text: ps.Submission})
		}
	}
	slots = append(slots, FibbageSlot{Text: q.Answer})
	rand.Shuffle(len(slots), func(i, j int) { slots[i], slots[j] = slots[j], slots[i] })
	for i := range slots {
		slots[i].ID = i
	}
	ms.FibbageSlots = slots
	ms.SubPhase = "voting"
	return nil
}

func (e *Engine) FibbageReveal() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "fibbage" || ms.SubPhase != "voting" {
		return ErrWrongPhase
	}
	q := ms.Config.FibbageQuestions[ms.CurrentQuestion]
	correctAnswer := strings.ToLower(strings.TrimSpace(q.Answer))
	// populate slot attributions
	for i := range ms.FibbageSlots {
		slot := &ms.FibbageSlots[i]
		if strings.EqualFold(strings.TrimSpace(slot.Text), q.Answer) {
			slot.IsCorrect = true
		} else {
			for pid, ps := range ms.FibbageStates {
				if strings.EqualFold(strings.TrimSpace(ps.Submission), slot.Text) {
					slot.PlayerID = pid
					break
				}
			}
		}
	}
	// score: find correct slot ID
	correctSlotID := -1
	for _, slot := range ms.FibbageSlots {
		if strings.ToLower(strings.TrimSpace(slot.Text)) == correctAnswer {
			correctSlotID = slot.ID
			break
		}
	}
	for playerID, ps := range ms.FibbageStates {
		if ps.VotedFor == correctSlotID && correctSlotID != -1 {
			ps.Points += 3
			ps.VotedCorrect = true
			if p, ok := e.state.Players[playerID]; ok {
				p.MiniGameScore += 3
			}
		}
	}
	// count fools
	for _, ps := range ms.FibbageStates {
		if ps.VotedFor == -1 || ps.VotedFor == correctSlotID {
			continue
		}
		// find who owns the voted slot
		for _, slot := range ms.FibbageSlots {
			if slot.ID == ps.VotedFor && slot.PlayerID != "" {
				ownerState := ms.FibbageStates[slot.PlayerID]
				if ownerState != nil {
					ownerState.Points += 2
					ownerState.FooledCount++
					if p, ok := e.state.Players[slot.PlayerID]; ok {
						p.MiniGameScore += 2
					}
				}
				break
			}
		}
	}
	e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	ms.SubPhase = "revealing"
	return nil
}

func (e *Engine) FibbageNextQuestion() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "fibbage" || ms.SubPhase != "revealing" {
		return ErrWrongPhase
	}
	ms.CurrentQuestion++
	ms.FibbageSlots = nil
	for _, ps := range ms.FibbageStates {
		ps.Submission = ""
		ps.VotedFor = -1
	}
	ms.SubPhase = "submitting"
	return nil
}

func (e *Engine) submitQuiplashAnswer(playerID, submission string) error {
	ms := e.state.MiniGame
	if ms.CurrentQuestion >= len(ms.QuiplashMatchups) {
		return ErrWrongPhase
	}
	matchup := ms.QuiplashMatchups[ms.CurrentQuestion]
	if playerID != matchup.PlayerA && playerID != matchup.PlayerB {
		return ErrInvalidAnswer // not a matched player this round
	}
	ps, ok := ms.QuiplashStates[playerID]
	if !ok {
		ms.QuiplashStates[playerID] = &PlayerQuiplashState{
			Submissions: make(map[int]string),
			Votes:       make(map[int]int),
		}
		ps = ms.QuiplashStates[playerID]
	}
	if _, already := ps.Submissions[ms.CurrentQuestion]; already {
		return ErrAlreadyAnswered
	}
	ps.Submissions[ms.CurrentQuestion] = strings.TrimSpace(submission)
	return nil
}

func (e *Engine) submitQuiplashVote(playerID string, slotID int) error {
	ms := e.state.MiniGame
	if p, ok := e.state.Players[playerID]; ok && p.Role == RoleAdmin {
		return ErrInvalidAnswer
	}
	if ms.CurrentQuestion >= len(ms.QuiplashMatchups) {
		return ErrWrongPhase
	}
	matchup := ms.QuiplashMatchups[ms.CurrentQuestion]
	if playerID == matchup.PlayerA || playerID == matchup.PlayerB {
		return ErrInvalidAnswer // matched players cannot vote
	}
	ps, ok := ms.QuiplashStates[playerID]
	if !ok {
		ms.QuiplashStates[playerID] = &PlayerQuiplashState{
			Submissions: make(map[int]string),
			Votes:       make(map[int]int),
		}
		ps = ms.QuiplashStates[playerID]
	}
	if _, already := ps.Votes[ms.CurrentQuestion]; already {
		return ErrAlreadyAnswered
	}
	if slotID != 0 && slotID != 1 {
		return ErrInvalidAnswer
	}
	ps.Votes[ms.CurrentQuestion] = slotID
	return nil
}

func (e *Engine) QuiplashStartVoting() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "quiplash" || ms.SubPhase != "submitting" {
		return ErrWrongPhase
	}
	if ms.CurrentQuestion >= len(ms.QuiplashMatchups) {
		return ErrWrongPhase
	}
	matchup := ms.QuiplashMatchups[ms.CurrentQuestion]
	psA := ms.QuiplashStates[matchup.PlayerA]
	psB := ms.QuiplashStates[matchup.PlayerB]
	textA := "(no answer)"
	textB := "(no answer)"
	if psA != nil {
		if t, ok := psA.Submissions[ms.CurrentQuestion]; ok && t != "" {
			textA = t
		}
	}
	if psB != nil {
		if t, ok := psB.Submissions[ms.CurrentQuestion]; ok && t != "" {
			textB = t
		}
	}
	// randomly assign slot 0 and slot 1
	slotA, slotB := 0, 1
	if rand.Intn(2) == 1 {
		slotA, slotB = 1, 0
	}
	ms.QuiplashSlots = []QuiplashSlot{
		{ID: slotA, Text: textA},
		{ID: slotB, Text: textB},
	}
	sort.Slice(ms.QuiplashSlots, func(i, j int) bool {
		return ms.QuiplashSlots[i].ID < ms.QuiplashSlots[j].ID
	})
	ms.SubPhase = "voting"
	return nil
}

func (e *Engine) QuiplashReveal() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "quiplash" || ms.SubPhase != "voting" {
		return ErrWrongPhase
	}
	if ms.CurrentQuestion >= len(ms.QuiplashMatchups) {
		return ErrWrongPhase
	}
	matchup := ms.QuiplashMatchups[ms.CurrentQuestion]
	psA := ms.QuiplashStates[matchup.PlayerA]
	psB := ms.QuiplashStates[matchup.PlayerB]
	textA := psA.Submissions[ms.CurrentQuestion]
	textB := psB.Submissions[ms.CurrentQuestion]
	// find which slot belongs to which player
	slotForA, slotForB := -1, -1
	for _, slot := range ms.QuiplashSlots {
		if slot.Text == textA {
			slotForA = slot.ID
		} else if slot.Text == textB {
			slotForB = slot.ID
		}
	}
	// count votes
	votesA, votesB := 0, 0
	for _, ps := range ms.QuiplashStates {
		if v, ok := ps.Votes[ms.CurrentQuestion]; ok {
			if v == slotForA {
				votesA++
			} else if v == slotForB {
				votesB++
			}
		}
	}
	// populate slot attributions and vote counts
	for i := range ms.QuiplashSlots {
		slot := &ms.QuiplashSlots[i]
		if slot.ID == slotForA {
			slot.PlayerID = matchup.PlayerA
			slot.Votes = votesA
		} else if slot.ID == slotForB {
			slot.PlayerID = matchup.PlayerB
			slot.Votes = votesB
		}
	}
	// award points
	ptsA := votesA * 2
	ptsB := votesB * 2
	if ptsA > 0 {
		psA.Points += ptsA
		if p, ok := e.state.Players[matchup.PlayerA]; ok {
			p.MiniGameScore += ptsA
		}
	}
	if ptsB > 0 {
		psB.Points += ptsB
		if p, ok := e.state.Players[matchup.PlayerB]; ok {
			p.MiniGameScore += ptsB
		}
	}
	e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	winnerID := ""
	if votesA > votesB {
		winnerID = matchup.PlayerA
	} else if votesB > votesA {
		winnerID = matchup.PlayerB
	}
	ms.QuiplashResults = append(ms.QuiplashResults, QuiplashRoundResult{
		RoundIndex: ms.CurrentQuestion,
		PlayerA:    matchup.PlayerA,
		PlayerB:    matchup.PlayerB,
		Prompt:     matchup.Prompt,
		TextA:      textA,
		TextB:      textB,
		VotesA:     votesA,
		VotesB:     votesB,
		WinnerID:   winnerID,
	})
	ms.SubPhase = "revealing"
	return nil
}

func (e *Engine) QuiplashNextRound() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "quiplash" || ms.SubPhase != "revealing" {
		return ErrWrongPhase
	}
	ms.CurrentQuestion++
	ms.QuiplashSlots = nil
	ms.SubPhase = "submitting"
	return nil
}

func (e *Engine) submitEmojiAnswer(playerID, answer string) error {
	ms := e.state.MiniGame
	if ms.SubPhase != "active" {
		return ErrWrongPhase
	}
	if ms.CurrentQuestion >= len(ms.Config.EmojiRounds) {
		return ErrWrongPhase
	}
	timerSecs := ms.Config.TimerSeconds
	if timerSecs <= 0 {
		timerSecs = 30
	}
	if ms.RoundStartedAt != nil {
		expiry := ms.RoundStartedAt.Add(time.Duration(timerSecs) * time.Second)
		if time.Now().After(expiry) {
			return ErrWrongPhase
		}
	}
	round := ms.Config.EmojiRounds[ms.CurrentQuestion]
	if !strings.EqualFold(strings.TrimSpace(answer), strings.TrimSpace(round.Answer)) {
		return ErrInvalidAnswer
	}
	// correct answer
	var elapsed float64
	if ms.RoundStartedAt != nil {
		elapsed = time.Since(*ms.RoundStartedAt).Seconds()
	}
	remaining := float64(timerSecs) - elapsed
	if remaining < 0 {
		remaining = 0
	}
	pts := int(math.Ceil(5 * remaining / float64(timerSecs)))
	if pts < 1 {
		pts = 1
	}
	ps := ms.EmojiStates[playerID]
	if ps == nil {
		ps = &PlayerEmojiState{RoundWins: make([]bool, len(ms.Config.EmojiRounds))}
		ms.EmojiStates[playerID] = ps
	}
	if ps.RoundWins[ms.CurrentQuestion] {
		return ErrAlreadyAnswered
	}
	ps.Points += pts
	ps.RoundWins[ms.CurrentQuestion] = true
	if p, ok := e.state.Players[playerID]; ok {
		p.MiniGameScore += pts
	}
	ms.EmojiCorrectAnswerers = append(ms.EmojiCorrectAnswerers, playerID)
	e.state.Leaderboard = BuildLeaderboard(e.state.Players)
	return nil
}

func (e *Engine) EmojiExpireRound() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "emoji_decode" || ms.SubPhase != "active" {
		return ErrWrongPhase
	}
	ms.SubPhase = "round_expired"
	return nil
}

func (e *Engine) EmojiNextRound() error {
	if e.state.Phase != PhaseMiniGame || e.state.MiniGame == nil {
		return ErrWrongPhase
	}
	ms := e.state.MiniGame
	if ms.Config.Type != "emoji_decode" {
		return ErrWrongPhase
	}
	if ms.SubPhase != "round_expired" {
		return ErrWrongPhase
	}
	ms.CurrentQuestion++
	ms.EmojiCorrectAnswerers = nil
	now := time.Now()
	ms.RoundStartedAt = &now
	ms.SubPhase = "active"
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
