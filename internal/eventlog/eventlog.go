package eventlog

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

type EventType string

const (
	EventGameStart     EventType = "game_start"
	EventPlayerJoin    EventType = "player_join"
	EventGuessSubmit   EventType = "guess_submit"
	EventCloseGuessing EventType = "close_guessing"
	EventNextRound     EventType = "next_round"
	EventGameComplete  EventType = "game_complete"
)

type Event struct {
	Time       time.Time   `json:"time"`
	Type       EventType   `json:"type"`
	RoundIndex int         `json:"roundIndex,omitempty"`
	PlayerID   string      `json:"playerId,omitempty"`
	Payload    interface{} `json:"payload,omitempty"`
}

type EventLog struct {
	mu   sync.Mutex
	file *os.File
}

func Open(dir string, startedAt time.Time) (*EventLog, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("eventlog: mkdir: %w", err)
	}
	name := fmt.Sprintf("%s/game-%d.jsonl", dir, startedAt.Unix())
	f, err := os.Create(name)
	if err != nil {
		return nil, fmt.Errorf("eventlog: create: %w", err)
	}
	return &EventLog{file: f}, nil
}

func (el *EventLog) Write(ev Event) {
	if el == nil {
		return
	}
	el.mu.Lock()
	defer el.mu.Unlock()
	data, err := json.Marshal(ev)
	if err != nil {
		return
	}
	data = append(data, '\n')
	el.file.Write(data)
}

func (el *EventLog) Close() {
	if el == nil {
		return
	}
	el.mu.Lock()
	defer el.mu.Unlock()
	if el.file != nil {
		el.file.Close()
		el.file = nil
	}
}
