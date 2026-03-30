package ws

import (
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"wineparty/internal/eventlog"
	"wineparty/internal/game"
	"wineparty/internal/repository"
)

type inboundMsg struct {
	client *Client
	data   []byte
}

type Hub struct {
	mu               sync.RWMutex
	clients          map[*Client]struct{}
	register         chan *Client
	unregister       chan *Client
	inbound          chan inboundMsg
	broadcast        chan []byte
	repo             repository.Repository
	engine           *game.Engine
	adminPass        string
	wines            []game.WineConfig
	colors           []game.PlayerColor
	logDir           string
	eventLog         *eventlog.EventLog
	miniGameSchedule []int
	miniGameConfigs  []game.MiniGameConfig
}

func (h *Hub) RegisterClient(c *Client) {
	h.register <- c
}

func NewHub(repo repository.Repository, engine *game.Engine, adminPass string, wines []game.WineConfig, colors []game.PlayerColor, logDir string, miniGameSchedule []int, miniGameConfigs []game.MiniGameConfig) *Hub {
	return &Hub{
		clients:          make(map[*Client]struct{}),
		register:         make(chan *Client, 16),
		unregister:       make(chan *Client, 16),
		inbound:          make(chan inboundMsg, 256),
		broadcast:        make(chan []byte, 64),
		repo:             repo,
		engine:           engine,
		adminPass:        adminPass,
		wines:            wines,
		colors:           colors,
		logDir:           logDir,
		miniGameSchedule: miniGameSchedule,
		miniGameConfigs:  miniGameConfigs,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			h.mu.Unlock()
			h.sendStateTo(c)

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
				if c.PlayerID != "" {
					h.engine.SetPlayerDisconnected(c.PlayerID)
					h.repo.SaveState()
					h.broadcastState()
				}
			}
			h.mu.Unlock()

		case msg := <-h.inbound:
			h.handleMessage(msg.client, msg.data)

		case data := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- data:
				default:
					slog.Warn("dropping broadcast to slow client", "playerID", c.PlayerID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) handleMessage(c *Client, data []byte) {
	var env struct {
		Type    MessageType     `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "invalid message format"})
		return
	}

	switch env.Type {
	case MsgJoin:
		h.handleJoin(c, env.Payload)
	case MsgGuessSubmit:
		h.handleGuess(c, env.Payload)
	case MsgAdminAction:
		h.handleAdminAction(c, env.Payload)
	case MsgMiniGameSubmit:
		h.handleMiniGameAnswer(c, env.Payload)
	default:
		c.sendEnvelope(MsgError, ErrorPayload{Message: "unknown message type"})
	}
}

func (h *Hub) handleJoin(c *Client, raw json.RawMessage) {
	var p JoinPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "invalid join payload"})
		return
	}

	role := game.RolePlayer
	if p.Password != "" {
		if p.Password == h.adminPass {
			role = game.RoleAdmin
		} else {
			c.sendEnvelope(MsgError, ErrorPayload{Message: "wrong admin password"})
			return
		}
	}

	_, isReconnect := h.repo.GetState().Players[p.PlayerID]
	player, _ := h.engine.AddPlayer(p.PlayerID, p.Name, p.Color, p.Avatar, role)
	c.PlayerID = player.ID
	h.repo.SaveState()
	slog.Info("player joined", "id", player.ID, "name", player.Name, "role", player.Role)
	if !isReconnect {
		h.eventLog.Write(eventlog.Event{
			Time:     time.Now(),
			Type:     eventlog.EventPlayerJoin,
			PlayerID: player.ID,
			Payload:  map[string]string{"name": player.Name, "role": string(player.Role)},
		})
	}
	h.broadcastState()
}

func (h *Hub) handleGuess(c *Client, raw json.RawMessage) {
	if c.PlayerID == "" {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "not joined"})
		return
	}
	var p GuessPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "invalid guess payload"})
		return
	}
	guess := game.Guess{
		PlayerID: c.PlayerID,
		Variety:  p.Variety,
		Country:  p.Country,
		Region:   p.Region,
		Year:     p.Year,
		Price:    p.Price,
		Flavors:  p.Flavors,
		Rating:   p.Rating,
	}
	if err := h.engine.SubmitGuess(guess); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: err.Error()})
		return
	}
	state := h.repo.GetState()
	h.eventLog.Write(eventlog.Event{
		Time:       time.Now(),
		Type:       eventlog.EventGuessSubmit,
		RoundIndex: state.CurrentRound,
		PlayerID:   c.PlayerID,
		Payload:    map[string]interface{}{"rating": p.Rating},
	})
	h.repo.SaveState()
	h.broadcastState()
}

func (h *Hub) handleAdminAction(c *Client, raw json.RawMessage) {
	state := h.repo.GetState()
	player, ok := state.Players[c.PlayerID]
	if !ok || player.Role != game.RoleAdmin {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "not authorized"})
		return
	}

	var p AdminActionPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "invalid admin payload"})
		return
	}

	var err error
	switch p.Action {
	case ActionStartGame:
		err = h.engine.StartGame()
		if err == nil {
			now := time.Now()
			h.eventLog.Close()
			el, elErr := eventlog.Open(h.logDir, now)
			if elErr != nil {
				slog.Warn("could not open event log", "err", elErr)
			} else {
				h.eventLog = el
			}
			h.eventLog.Write(eventlog.Event{
				Time: now,
				Type: eventlog.EventGameStart,
			})
		}
	case ActionCloseGuessing:
		roundIndex := h.repo.GetState().CurrentRound
		h.engine.ClearTimer()
		err = h.engine.CloseGuessing()
		if err == nil {
			h.eventLog.Write(eventlog.Event{
				Time:       time.Now(),
				Type:       eventlog.EventCloseGuessing,
				RoundIndex: roundIndex,
			})
		}
	case ActionNextRound:
		roundIndex := h.repo.GetState().CurrentRound
		h.engine.ClearTimer()
		err = h.engine.NextRound()
		if err == nil {
			newState := h.engine.State()
			evType := eventlog.EventNextRound
			if newState.Phase == game.PhaseComplete {
				evType = eventlog.EventGameComplete
			}
			h.eventLog.Write(eventlog.Event{
				Time:       time.Now(),
				Type:       evType,
				RoundIndex: roundIndex,
			})
		}
	case ActionSetTimer:
		h.engine.SetTimer(p.DurationSecs)
	case ActionStartTimer:
		err = h.engine.StartTimer()
	case ActionPauseTimer:
		h.engine.PauseTimer()
	case ActionResetTimer:
		h.engine.ResetTimer()
	case ActionSetScore:
		err = h.engine.SetPlayerScore(p.PlayerID, p.Score)
	case ActionResetGame:
		wineConfigs := make([]game.WineConfig, len(h.wines))
		for i, w := range h.wines {
			wineConfigs[i] = game.WineConfig{
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
		h.engine.ResetToLobby(wineConfigs)
		state := h.engine.State()
		state.MiniGameSchedule = h.miniGameSchedule
		state.MiniGameConfigs = h.miniGameConfigs
		state.Colors = h.colors
		h.eventLog.Close()
		h.eventLog = nil
	case ActionEndMiniGame:
		err = h.engine.EndMiniGame()
	case ActionMiniGameNextQuestion:
		err = h.engine.MiniGameNextQuestion()
	case ActionMiniGameRevealAnswer:
		err = h.engine.MiniGameRevealAnswer()
	case ActionEndMiniGameResults:
		err = h.engine.EndMiniGameResults()
	case ActionMiniGameStartVoting:
		mg := h.engine.State().MiniGame
		if mg == nil {
			err = game.ErrWrongPhase
		} else if mg.Config.Type == "fibbage" {
			err = h.engine.FibbageStartVoting()
		} else if mg.Config.Type == "quiplash" {
			err = h.engine.QuiplashStartVoting()
		} else {
			err = game.ErrWrongPhase
		}
	case ActionMiniGameReveal:
		mg := h.engine.State().MiniGame
		if mg == nil {
			err = game.ErrWrongPhase
		} else if mg.Config.Type == "fibbage" {
			err = h.engine.FibbageReveal()
		} else if mg.Config.Type == "quiplash" {
			err = h.engine.QuiplashReveal()
		} else {
			err = game.ErrWrongPhase
		}
	case ActionMiniGameAdvance:
		mg := h.engine.State().MiniGame
		if mg == nil {
			err = game.ErrWrongPhase
		} else if mg.Config.Type == "fibbage" {
			err = h.engine.FibbageNextQuestion()
		} else if mg.Config.Type == "quiplash" {
			err = h.engine.QuiplashNextRound()
		} else {
			err = game.ErrWrongPhase
		}
	case ActionEmojiExpireRound:
		err = h.engine.EmojiExpireRound()
	case ActionEmojiNextRound:
		err = h.engine.EmojiNextRound()
	case ActionAdvanceIntro:
		err = h.engine.AdvanceIntro()
	default:
		c.sendEnvelope(MsgError, ErrorPayload{Message: "unknown admin action"})
		return
	}

	if err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: err.Error()})
		return
	}
	h.repo.SaveState()
	h.broadcastState()
}

func (h *Hub) handleMiniGameAnswer(c *Client, raw json.RawMessage) {
	if c.PlayerID == "" {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "not joined"})
		return
	}
	var p MiniGameAnswerPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: "invalid mini-game answer payload"})
		return
	}
	ans := game.MiniGameAnswer{
		WordleGuess:        p.WordleGuess,
		ConnGroup:          p.ConnGroup,
		TriviaAnswerIndex:  p.TriviaAnswerIndex,
		FibbageSubmission:  p.FibbageSubmission,
		FibbageVoteSlot:    p.FibbageVoteSlot,
		QuiplashSubmission: p.QuiplashSubmission,
		QuiplashVoteSlot:   p.QuiplashVoteSlot,
		EmojiAnswer:        p.EmojiAnswer,
	}
	if err := h.engine.SubmitMiniGameAnswer(c.PlayerID, ans); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: err.Error()})
		if !errors.Is(err, game.ErrInvalidAnswer) {
			return
		}
		// ErrInvalidAnswer from connections mutates state (counters); fall through to broadcast
	}
	h.repo.SaveState()
	h.broadcastState()
}

func (h *Hub) broadcastState() {
	state := h.repo.GetState()
	env := Envelope{Type: MsgGameState, Payload: state}
	data, err := json.Marshal(env)
	if err != nil {
		slog.Error("marshal state", "err", err)
		return
	}
	h.broadcast <- data
}

func (h *Hub) sendStateTo(c *Client) {
	state := h.repo.GetState()
	env := Envelope{Type: MsgGameState, Payload: state}
	data, err := json.Marshal(env)
	if err != nil {
		slog.Error("marshal state for new client", "err", err)
		return
	}
	select {
	case c.send <- data:
	default:
		slog.Warn("new client send buffer full on connect")
	}
}
