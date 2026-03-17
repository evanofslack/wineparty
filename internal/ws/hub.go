package ws

import (
	"encoding/json"
	"log/slog"
	"sync"

	"wineparty/internal/game"
	"wineparty/internal/repository"
)

type inboundMsg struct {
	client *Client
	data   []byte
}

type Hub struct {
	mu          sync.RWMutex
	clients     map[*Client]struct{}
	register    chan *Client
	unregister  chan *Client
	inbound     chan inboundMsg
	broadcast   chan []byte
	repo        repository.Repository
	engine      *game.Engine
	adminPass   string
	wines       []game.WineConfig
}

func (h *Hub) RegisterClient(c *Client) {
	h.register <- c
}

func NewHub(repo repository.Repository, engine *game.Engine, adminPass string, wines []game.WineConfig) *Hub {
	return &Hub{
		clients:    make(map[*Client]struct{}),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
		inbound:    make(chan inboundMsg, 256),
		broadcast:  make(chan []byte, 64),
		repo:       repo,
		engine:     engine,
		adminPass:  adminPass,
		wines:      wines,
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

	player, _ := h.engine.AddPlayer(p.PlayerID, p.Name, role)
	c.PlayerID = player.ID
	h.repo.SaveState()
	slog.Info("player joined", "id", player.ID, "name", player.Name, "role", player.Role)
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
		Flavors:  p.Flavors,
	}
	if err := h.engine.SubmitGuess(guess); err != nil {
		c.sendEnvelope(MsgError, ErrorPayload{Message: err.Error()})
		return
	}
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
	case ActionCloseGuessing:
		err = h.engine.CloseGuessing()
	case ActionNextRound:
		err = h.engine.NextRound()
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
			}
		}
		h.engine.ResetToLobby(wineConfigs)
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
