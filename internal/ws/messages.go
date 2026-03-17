package ws

import "wineparty/internal/game"

// MessageType identifies the type of a WebSocket message.
// NEVER reorder — append only.
type MessageType int

const (
	MsgJoin         MessageType = iota // 0: client -> server: player joins
	MsgGameState                       // 1: server -> client: full game state push
	MsgError                           // 2: server -> client: error message
	MsgGuessSubmit                     // 3: client -> server: player submits guess
	MsgAdminAction                     // 4: client -> server: admin issues command
	MsgPlayerList                      // 5: server -> client: current player list (unused, state covers it)
)

// AdminActionType identifies an admin command.
// NEVER reorder — append only.
type AdminActionType int

const (
	ActionStartGame    AdminActionType = iota // 0
	ActionCloseGuessing                       // 1
	ActionNextRound                           // 2
	ActionSetScore                            // 3
	ActionResetGame                           // 4
)

// Envelope is the outer wrapper for all WS messages.
type Envelope struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload"`
}

// JoinPayload is sent by a client to join the game.
type JoinPayload struct {
	PlayerID string    `json:"playerId"`
	Name     string    `json:"name"`
	Password string    `json:"password,omitempty"` // set to claim admin role
}

// ErrorPayload carries an error message to the client.
type ErrorPayload struct {
	Message string `json:"message"`
}

// GuessPayload carries a player's wine guess.
type GuessPayload struct {
	Variety string            `json:"variety"`
	Country string            `json:"country"`
	Region  string            `json:"region"`
	Year    int               `json:"year"`
	Flavors []game.FlavorNote `json:"flavors"`
	Rating  int               `json:"rating"`
}

// AdminActionPayload carries an admin command.
type AdminActionPayload struct {
	Action   AdminActionType `json:"action"`
	PlayerID string          `json:"playerId,omitempty"` // for ActionSetScore
	Score    int             `json:"score,omitempty"`    // for ActionSetScore
}
