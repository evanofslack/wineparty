package game

import "time"

type Phase string

const (
	PhaseLobby    Phase = "lobby"
	PhaseGuessing Phase = "guessing"
	PhaseScoring  Phase = "scoring"
	PhaseComplete Phase = "complete"
	PhaseMiniGame Phase = "minigame"
)

type Role string

const (
	RolePlayer Role = "player"
	RoleAdmin  Role = "admin"
)

type Player struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Role       Role      `json:"role"`
	Connected  bool      `json:"connected"`
	JoinedAt   time.Time `json:"joinedAt"`
	TotalScore int       `json:"totalScore"`
}

type FlavorNote string

type Guess struct {
	PlayerID   string       `json:"playerId"`
	RoundIndex int          `json:"roundIndex"`
	Variety    string       `json:"variety"`
	Region     string       `json:"region"`
	Year       int          `json:"year"`
	Flavors    []FlavorNote `json:"flavors"`
	SubmittedAt time.Time   `json:"submittedAt"`
}

type RoundScore struct {
	PlayerID    string `json:"playerId"`
	RoundIndex  int    `json:"roundIndex"`
	Points      int    `json:"points"`
	VarietyHit  bool   `json:"varietyHit"`
	RegionHit   bool   `json:"regionHit"`
	YearPoints  int    `json:"yearPoints"`
	FlavorPoints int   `json:"flavorPoints"`
}

type LeaderboardEntry struct {
	Rank       int    `json:"rank"`
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
	Score      int    `json:"score"`
}

type WineConfig struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Variety string `json:"variety"`
	Region  string `json:"region"`
	Year    int    `json:"year"`
	Hint    string `json:"hint"`
}

type Round struct {
	Index      int        `json:"index"`
	Wine       WineConfig `json:"wine"`
	Guesses    []Guess    `json:"guesses"`
	Scores     []RoundScore `json:"scores"`
	RevealedAt *time.Time `json:"revealedAt,omitempty"`
}

type GameState struct {
	Phase        Phase              `json:"phase"`
	CurrentRound int                `json:"currentRound"`
	Rounds       []Round            `json:"rounds"`
	Players      map[string]*Player `json:"players"`
	Leaderboard  []LeaderboardEntry `json:"leaderboard"`
	StartedAt    *time.Time         `json:"startedAt,omitempty"`
	CompletedAt  *time.Time         `json:"completedAt,omitempty"`
}

func NewGameState(wines []WineConfig) *GameState {
	rounds := make([]Round, len(wines))
	for i, w := range wines {
		rounds[i] = Round{
			Index:   i,
			Wine:    w,
			Guesses: []Guess{},
			Scores:  []RoundScore{},
		}
	}
	return &GameState{
		Phase:        PhaseLobby,
		CurrentRound: 0,
		Rounds:       rounds,
		Players:      make(map[string]*Player),
		Leaderboard:  []LeaderboardEntry{},
	}
}
