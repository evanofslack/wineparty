package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	"gopkg.in/yaml.v3"

	"wineparty/internal/config"
	"wineparty/internal/game"
	"wineparty/internal/ws"
)

var (
	botVarieties       = []string{"Cabernet Sauvignon", "Chardonnay", "Pinot Noir", "Merlot", "Grenache"}
	botCountries       = []string{"France", "USA", "Italy", "Spain", "Australia"}
	botRegions         = []string{"Napa Valley", "Burgundy", "Tuscany", "Rioja", "Barossa Valley"}
	botFlavors         = []string{"cherry", "oak", "vanilla", "pepper", "lemon", "peach"}
	botWords           = []string{"ARISE", "STARE", "CRANE", "SLATE", "ADIEU", "ROAST", "TRAIN", "AUDIO", "SNARE", "TRACE"}
	botFibbagePhrases  = []string{"a silver spoon", "the wine fairy", "grape juice concentrate", "a tiny umbrella", "fermented sadness", "a cork whisperer", "old grape socks", "a tiny horse", "the forbidden grape"}
	botQuiplashPhrases = []string{"my credit score", "the tears of a sommelier", "suspiciously warm cheese", "a very confident raccoon", "someone else's homework", "the last sip of dignity", "a firm handshake from a ghost"}
)

type botConfig struct {
	addr       string
	prefix     string
	minDelay   int
	maxDelay   int
	strategy   string
	lobbyToken string
	wines      []config.Wine
	games      []config.GameConfig
	colors     []config.PlayerColor
}

type inboundMsg struct {
	Type    ws.MessageType  `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type bot struct {
	id   string
	name string
	cfg  botConfig
	conn *websocket.Conn
	log  *slog.Logger

	lastRound  int
	lastActKey string // encodes the last minigame action taken, per game type
}

func main() {
	addr := flag.String("addr", "ws://localhost:8080/ws", "WebSocket address")
	players := flag.Int("players", 3, "Number of bot players (2-10)")
	prefix := flag.String("prefix", "Bot", "Name prefix for bots")
	minDelay := flag.Int("min-delay", 500, "Minimum action delay in milliseconds")
	maxDelay := flag.Int("max-delay", 3000, "Maximum action delay in milliseconds")
	strategy := flag.String("strategy", "random", "Answer strategy: random or correct")
	lobbyToken := flag.String("lobby-token", "changeme", "Lobby token required to join")
	logLevel := flag.String("loglevel", "info", "Log level: debug, info, warn, error")
	winesFile := flag.String("wines-file", "config/wines.yaml", "Path to wines YAML")
	gamesFile := flag.String("games-file", "config/games.yaml", "Path to games YAML")
	colorsFile := flag.String("colors-file", "config/colors.yaml", "Path to colors YAML")
	flag.Parse()

	var level slog.Level
	switch strings.ToLower(*logLevel) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level})))

	if *players < 1 || *players > 12 {
		slog.Error("--players must be between 1 and 12")
		os.Exit(1)
	}
	if *strategy != "random" && *strategy != "correct" {
		slog.Error("--strategy must be random or correct")
		os.Exit(1)
	}

	wines, games, colors := loadConfigs(*winesFile, *gamesFile, *colorsFile)

	cfg := botConfig{
		addr:       *addr,
		prefix:     *prefix,
		minDelay:   *minDelay,
		maxDelay:   *maxDelay,
		strategy:   *strategy,
		lobbyToken: *lobbyToken,
		wines:      wines,
		games:      games,
		colors:     colors,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sig
		slog.Info("shutting down")
		cancel()
	}()

	var wg sync.WaitGroup
	for i := 1; i <= *players; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			b := &bot{
				id:        fmt.Sprintf("simbot-%d", n),
				name:      fmt.Sprintf("%s%d", cfg.prefix, n),
				cfg:       cfg,
				log:       slog.Default().With("bot", fmt.Sprintf("%s%d", cfg.prefix, n)),
				lastRound: -1,
			}
			b.run(ctx)
		}(i)
		time.Sleep(750 * time.Millisecond)
	}

	wg.Wait()
	slog.Info("all bots exited")
}

func loadConfigs(winesPath, gamesPath, colorsPath string) ([]config.Wine, []config.GameConfig, []config.PlayerColor) {
	var wines []config.Wine
	if data, err := os.ReadFile(winesPath); err != nil {
		slog.Warn("could not read wines file", "path", winesPath, "err", err)
	} else {
		var wf config.WinesFile
		if err := yaml.Unmarshal(data, &wf); err != nil {
			slog.Warn("could not parse wines file", "err", err)
		} else {
			wines = wf.Wines
			slog.Info("loaded wines", "count", len(wines))
		}
	}

	var games []config.GameConfig
	if data, err := os.ReadFile(gamesPath); err != nil {
		slog.Warn("could not read games file", "path", gamesPath, "err", err)
	} else {
		var gf config.GamesFile
		if err := yaml.Unmarshal(data, &gf); err != nil {
			slog.Warn("could not parse games file", "err", err)
		} else {
			games = gf.Games
			slog.Info("loaded games", "count", len(games))
		}
	}

	var colors []config.PlayerColor
	if data, err := os.ReadFile(colorsPath); err != nil {
		slog.Warn("could not read colors file", "path", colorsPath, "err", err)
	} else {
		var cf config.ColorsFile
		if err := yaml.Unmarshal(data, &cf); err != nil {
			slog.Warn("could not parse colors file", "err", err)
		} else {
			colors = cf.Colors
		}
	}

	return wines, games, colors
}

// randomColor picks a random hex color from the loaded palette, falling back
// to a hardcoded set if the file wasn't loaded.
func randomColor(colors []config.PlayerColor) string {
	if len(colors) > 0 {
		return colors[rand.Intn(len(colors))].Hex
	}
	fallback := []string{"#C0392B", "#2980B9", "#27AE60", "#8E44AD", "#E67E22", "#E91E8C", "#16A085", "#F1C40F"}
	return fallback[rand.Intn(len(fallback))]
}

// randomAvatar generates a 64-char avatar string for an 8×8 pixel grid.
// Left 4 columns are random; right 4 are mirrored left→right for symmetry.
// '0' = player color, '1' = dark, '2' = white.
func randomAvatar() string {
	cells := make([]byte, 64)
	weights := []byte{'0', '0', '0', '1', '1', '2'} // mostly color, some dark, a little white
	for row := 0; row < 8; row++ {
		for col := 0; col < 4; col++ {
			v := weights[rand.Intn(len(weights))]
			cells[row*8+col] = v
			cells[row*8+(7-col)] = v
		}
	}
	return string(cells)
}

func (b *bot) run(ctx context.Context) {
	dialer := websocket.Dialer{HandshakeTimeout: 10 * time.Second}
	conn, _, err := dialer.DialContext(ctx, b.cfg.addr, nil)
	if err != nil {
		b.log.Error("failed to connect", "err", err)
		return
	}
	b.conn = conn
	defer conn.Close()

	// Handle pings from the server so the connection stays alive even when
	// the react goroutine is sleeping (e.g. during emoji jitter).
	conn.SetPingHandler(func(data string) error {
		return conn.WriteControl(websocket.PongMessage, []byte(data), time.Now().Add(10*time.Second))
	})

	color := randomColor(b.cfg.colors)
	avatar := randomAvatar()
	if err := b.send(ws.MsgJoin, ws.JoinPayload{PlayerID: b.id, Name: b.name, Color: color, Avatar: avatar, LobbyToken: b.cfg.lobbyToken}); err != nil {
		b.log.Error("failed to send join", "err", err)
		return
	}
	b.log.Info("joined")

	// stateCh carries the latest game state to the react goroutine.
	// Buffer size 1: if the react goroutine is busy, we replace the pending
	// state with the newer one so it always acts on the freshest state.
	stateCh := make(chan game.GameState, 1)

	readDone := make(chan struct{})
	go func() {
		defer close(readDone)
		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				if ctx.Err() == nil {
					b.log.Warn("read error", "err", err)
				}
				return
			}
			var msg inboundMsg
			if err := json.Unmarshal(raw, &msg); err != nil {
				b.log.Warn("could not unmarshal message", "err", err)
				continue
			}
			switch msg.Type {
			case ws.MsgError:
				var ep ws.ErrorPayload
				if err := json.Unmarshal(msg.Payload, &ep); err == nil {
					b.log.Warn("server error", "message", ep.Message)
				}
			case ws.MsgGameState:
				var state game.GameState
				if err := json.Unmarshal(msg.Payload, &state); err != nil {
					b.log.Warn("could not unmarshal game state", "err", err)
					continue
				}
				// Non-blocking send: drain any stale state first, then enqueue.
				select {
				case <-stateCh:
				default:
				}
				select {
				case stateCh <- state:
				default:
				}
			}
		}
	}()

	reactDone := make(chan struct{})
	go func() {
		defer close(reactDone)
		for {
			select {
			case state := <-stateCh:
				b.react(&state)
			case <-ctx.Done():
				return
			case <-readDone:
				return
			}
		}
	}()

	select {
	case <-ctx.Done():
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	case <-readDone:
	}
	<-reactDone
}

func (b *bot) send(msgType ws.MessageType, payload any) error {
	data, err := json.Marshal(ws.Envelope{Type: msgType, Payload: payload})
	if err != nil {
		return err
	}
	return b.conn.WriteMessage(websocket.TextMessage, data)
}

func (b *bot) react(state *game.GameState) {
	switch state.Phase {
	case game.PhaseGuessing:
		b.maybeGuess(state)
	case game.PhaseMiniGame:
		b.maybeMiniGame(state)
	case game.PhaseComplete:
		b.log.Info("game complete")
	}
}

func (b *bot) maybeGuess(state *game.GameState) {
	round := state.CurrentRound
	if round < 0 || round >= len(state.Rounds) {
		return
	}
	for _, g := range state.Rounds[round].Guesses {
		if g.PlayerID == b.id {
			return
		}
	}
	if b.lastRound == round {
		return
	}
	b.lastRound = round

	b.jitter()

	var payload ws.GuessPayload
	if b.cfg.strategy == "correct" && round < len(b.cfg.wines) {
		w := b.cfg.wines[round]
		var flavor game.FlavorNote
		if len(w.Flavors) > 0 {
			flavor = game.FlavorNote(w.Flavors[0])
		}
		payload = ws.GuessPayload{
			Variety: w.Variety,
			Country: w.Country,
			Region:  w.Region,
			Year:    w.Year,
			Price:   w.Price,
			Flavors: []game.FlavorNote{flavor},
			Rating:  8,
		}
	} else {
		f1 := game.FlavorNote(pick(botFlavors))
		f2 := game.FlavorNote(pick(botFlavors))
		payload = ws.GuessPayload{
			Variety: pick(botVarieties),
			Country: pick(botCountries),
			Region:  pick(botRegions),
			Year:    2015 + rand.Intn(8),
			Price:   20 + rand.Intn(61),
			Flavors: []game.FlavorNote{f1, f2},
			Rating:  5 + rand.Intn(5),
		}
	}

	if err := b.send(ws.MsgGuessSubmit, payload); err != nil {
		b.log.Warn("failed to send guess", "err", err)
		return
	}
	b.log.Info("submitted guess", "round", round, "variety", payload.Variety)
}

func (b *bot) maybeMiniGame(state *game.GameState) {
	mg := state.MiniGame
	if mg == nil {
		return
	}
	switch mg.Config.Type {
	case "wordle":
		b.maybeWordle(mg)
	case "connections":
		b.maybeConnections(mg)
	case "trivia":
		b.maybeTrivia(mg)
	case "fibbage":
		b.maybeFibbage(mg)
	case "quiplash":
		b.maybeQuiplash(mg)
	case "emoji_decode":
		b.maybeEmoji(mg)
	}
}

// acted returns true if the bot has already taken action for the given key.
// Each game type computes its own key to track the right granularity:
// wordle keys on guess count, connections on found group count, others on
// (question, subPhase).
func (b *bot) acted(key string) bool {
	return b.lastActKey == key
}

func (b *bot) markAct(key string) {
	b.lastActKey = key
}

func (b *bot) maybeWordle(mg *game.MiniGameState) {
	ps := mg.WordleStates[b.id]
	guessCount := 0
	if ps != nil {
		if ps.Solved || len(ps.Guesses) >= mg.Config.MaxGuesses {
			return
		}
		guessCount = len(ps.Guesses)
	}
	// Key on guess count so the bot submits one guess per round-trip.
	key := fmt.Sprintf("wordle-%d", guessCount)
	if b.acted(key) {
		return
	}
	b.markAct(key)
	b.jitter()

	var guess string
	if b.cfg.strategy == "correct" {
		guess = mg.Config.Word
	} else {
		guess = pick(botWords)
	}

	if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{WordleGuess: guess}); err != nil {
		b.log.Warn("wordle: failed to send guess", "err", err)
		return
	}
	b.log.Info("wordle: submitted guess", "guess", guess)
}

func (b *bot) maybeConnections(mg *game.MiniGameState) {
	ps := mg.ConnStates[b.id]
	foundCount := 0
	if ps != nil {
		if ps.TotalGuesses >= 5 || len(ps.FoundGroups) >= len(mg.Config.Groups) {
			return
		}
		foundCount = len(ps.FoundGroups)
	}
	// Key on found-group count so the bot submits one guess per round-trip.
	key := fmt.Sprintf("conn-%d", foundCount)
	if b.acted(key) {
		return
	}
	b.markAct(key)
	b.jitter()

	var words []string
	if b.cfg.strategy == "correct" {
		found := make(map[string]bool)
		if ps != nil {
			for _, cat := range ps.FoundGroups {
				found[cat] = true
			}
		}
		for _, grp := range mg.Config.Groups {
			if !found[grp.Category] {
				words = grp.Words
				break
			}
		}
	}
	if len(words) == 0 {
		var all []string
		for _, grp := range mg.Config.Groups {
			all = append(all, grp.Words...)
		}
		rand.Shuffle(len(all), func(i, j int) { all[i], all[j] = all[j], all[i] })
		if len(all) >= 4 {
			words = all[:4]
		}
	}
	if len(words) == 0 {
		return
	}

	if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{ConnGroup: words}); err != nil {
		b.log.Warn("connections: failed to send group", "err", err)
		return
	}
	b.log.Info("connections: submitted group", "words", words)
}

func (b *bot) maybeTrivia(mg *game.MiniGameState) {
	q := mg.CurrentQuestion
	if q >= len(mg.Config.Questions) {
		return
	}
	// The engine pre-fills ps.Answers with -1 for every question, so
	// len(ps.Answers) is always the total question count — not useful as a
	// "have I answered" check. Use the sentinel value instead.
	ps := mg.TriviaStates[b.id]
	if ps != nil && q < len(ps.Answers) && ps.Answers[q] != -1 {
		return
	}
	key := fmt.Sprintf("trivia-%d", q)
	if b.acted(key) {
		return
	}
	b.markAct(key)
	b.jitter()

	question := mg.Config.Questions[q]
	idx := rand.Intn(len(question.Options))
	if b.cfg.strategy == "correct" {
		for i, opt := range question.Options {
			if strings.EqualFold(strings.TrimSpace(opt), strings.TrimSpace(question.Answer)) {
				idx = i
				break
			}
		}
	}

	if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{TriviaAnswerIndex: idx}); err != nil {
		b.log.Warn("trivia: failed to send answer", "err", err)
		return
	}
	b.log.Info("trivia: submitted answer", "question", q, "index", idx)
}

func (b *bot) maybeFibbage(mg *game.MiniGameState) {
	q := mg.CurrentQuestion
	if q >= len(mg.Config.FibbageQuestions) {
		return
	}

	switch mg.SubPhase {
	case "submitting":
		ps := mg.FibbageStates[b.id]
		if ps != nil && ps.Submission != "" {
			return
		}
		key := fmt.Sprintf("fibbage-sub-%d", q)
		if b.acted(key) {
			return
		}
		b.markAct(key)
		b.jitter()

		correctAnswer := mg.Config.FibbageQuestions[q].Answer
		submission := pickExcluding(botFibbagePhrases, correctAnswer)

		if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{FibbageSubmission: submission}); err != nil {
			b.log.Warn("fibbage: failed to send submission", "err", err)
			return
		}
		b.log.Info("fibbage: submitted answer", "question", q, "text", submission)

	case "voting":
		ps := mg.FibbageStates[b.id]
		if ps == nil || ps.VotedFor != -1 {
			return
		}
		key := fmt.Sprintf("fibbage-vote-%d", q)
		if b.acted(key) {
			return
		}
		b.markAct(key)
		b.jitter()

		correctAnswer := mg.Config.FibbageQuestions[q].Answer
		var slotID int
		if b.cfg.strategy == "correct" {
			slotID = -1
			for _, slot := range mg.FibbageSlots {
				if strings.EqualFold(strings.TrimSpace(slot.Text), strings.TrimSpace(correctAnswer)) {
					slotID = slot.ID
					break
				}
			}
			if slotID == -1 {
				slotID = b.pickFibbageSlot(mg, ps.Submission)
			}
		} else {
			slotID = b.pickFibbageSlot(mg, ps.Submission)
		}

		if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{FibbageVoteSlot: slotID}); err != nil {
			b.log.Warn("fibbage: failed to send vote", "err", err)
			return
		}
		b.log.Info("fibbage: voted", "slot", slotID)
	}
}

func (b *bot) pickFibbageSlot(mg *game.MiniGameState, ownSubmission string) int {
	for _, slot := range mg.FibbageSlots {
		if !strings.EqualFold(strings.TrimSpace(slot.Text), strings.TrimSpace(ownSubmission)) {
			return slot.ID
		}
	}
	if len(mg.FibbageSlots) > 0 {
		return mg.FibbageSlots[0].ID
	}
	return 0
}

func (b *bot) maybeQuiplash(mg *game.MiniGameState) {
	q := mg.CurrentQuestion
	if q >= len(mg.QuiplashMatchups) {
		return
	}
	matchup := mg.QuiplashMatchups[q]
	isMatched := b.id == matchup.PlayerA || b.id == matchup.PlayerB

	switch mg.SubPhase {
	case "submitting":
		if !isMatched {
			return
		}
		ps := mg.QuiplashStates[b.id]
		if ps != nil {
			if _, ok := ps.Submissions[q]; ok {
				return
			}
		}
		key := fmt.Sprintf("quiplash-sub-%d", q)
		if b.acted(key) {
			return
		}
		b.markAct(key)
		b.jitter()

		submission := pick(botQuiplashPhrases)
		if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{QuiplashSubmission: submission}); err != nil {
			b.log.Warn("quiplash: failed to send submission", "err", err)
			return
		}
		b.log.Info("quiplash: submitted answer", "round", q, "text", submission)

	case "voting":
		if isMatched {
			return
		}
		ps := mg.QuiplashStates[b.id]
		if ps != nil {
			if _, ok := ps.Votes[q]; ok {
				return
			}
		}
		key := fmt.Sprintf("quiplash-vote-%d", q)
		if b.acted(key) {
			return
		}
		b.markAct(key)
		b.jitter()

		slot := rand.Intn(2)
		if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{QuiplashVoteSlot: slot}); err != nil {
			b.log.Warn("quiplash: failed to send vote", "err", err)
			return
		}
		b.log.Info("quiplash: voted", "round", q, "slot", slot)
	}
}

func (b *bot) maybeEmoji(mg *game.MiniGameState) {
	if mg.SubPhase != "active" {
		return
	}
	q := mg.CurrentQuestion
	if q >= len(mg.Config.EmojiRounds) {
		return
	}
	ps := mg.EmojiStates[b.id]
	if ps != nil && q < len(ps.RoundWins) && ps.RoundWins[q] {
		return
	}
	key := fmt.Sprintf("emoji-%d", q)
	if b.acted(key) {
		return
	}
	b.markAct(key)

	var delay time.Duration
	if b.cfg.strategy == "correct" {
		delay = time.Duration(1000+rand.Intn(2000)) * time.Millisecond
	} else {
		delay = time.Duration(10000+rand.Intn(15000)) * time.Millisecond
	}
	time.Sleep(delay)

	answer := mg.Config.EmojiRounds[q].Answer
	if err := b.send(ws.MsgMiniGameSubmit, ws.MiniGameAnswerPayload{EmojiAnswer: answer}); err != nil {
		b.log.Warn("emoji: failed to send answer", "err", err)
		return
	}
	b.log.Info("emoji: submitted answer", "round", q, "answer", answer)
}

func (b *bot) jitter() {
	d := b.cfg.minDelay + rand.Intn(b.cfg.maxDelay-b.cfg.minDelay+1)
	time.Sleep(time.Duration(d) * time.Millisecond)
}

func pick(pool []string) string {
	if len(pool) == 0 {
		return ""
	}
	return pool[rand.Intn(len(pool))]
}

func pickExcluding(pool []string, exclude string) string {
	var candidates []string
	for _, s := range pool {
		if !strings.EqualFold(strings.TrimSpace(s), strings.TrimSpace(exclude)) {
			candidates = append(candidates, s)
		}
	}
	if len(candidates) == 0 {
		return pool[rand.Intn(len(pool))]
	}
	return candidates[rand.Intn(len(candidates))]
}
