package game

import "time"

type WordleLetterState string

const (
	LetterCorrect WordleLetterState = "correct"
	LetterPresent WordleLetterState = "present"
	LetterAbsent  WordleLetterState = "absent"
)

type WordleGuessResult struct {
	Word   string              `json:"word"`
	States []WordleLetterState `json:"states"`
}

type PlayerWordleState struct {
	Guesses []WordleGuessResult `json:"guesses"`
	Solved  bool                `json:"solved"`
	Points  int                 `json:"points"`
}

type PlayerConnectionsState struct {
	FoundGroups []string `json:"foundGroups"`
	Points      int      `json:"points"`
}

type PlayerTriviaState struct {
	Answers []int `json:"answers"`
	Points  int   `json:"points"`
}

type ConnectionsGroup struct {
	Category string   `json:"category"`
	Color    string   `json:"color"`
	Words    []string `json:"words"`
}

type TriviaQuestion struct {
	Text    string   `json:"text"`
	Options []string `json:"options"`
	Answer  string   `json:"answer"`
	Points  int      `json:"points"`
}

type MiniGameConfig struct {
	Type       string             `json:"type"`
	Word       string             `json:"word,omitempty"`
	MaxGuesses int                `json:"maxGuesses,omitempty"`
	Groups     []ConnectionsGroup `json:"groups,omitempty"`
	Questions  []TriviaQuestion   `json:"questions,omitempty"`
}

type MiniGameState struct {
	Config          MiniGameConfig                     `json:"config"`
	CurrentQuestion int                                `json:"currentQuestion"`
	WordleStates    map[string]*PlayerWordleState      `json:"wordleStates,omitempty"`
	ConnStates      map[string]*PlayerConnectionsState `json:"connStates,omitempty"`
	TriviaStates    map[string]*PlayerTriviaState      `json:"triviaStates,omitempty"`
}

type MiniGameAnswer struct {
	WordleGuess       string
	ConnGroup         []string
	TriviaAnswerIndex int
}

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
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Role          Role      `json:"role"`
	Connected     bool      `json:"connected"`
	JoinedAt      time.Time `json:"joinedAt"`
	TotalScore    int       `json:"totalScore"`
	MiniGameScore int       `json:"miniGameScore"`
}

type FlavorNote string

type Guess struct {
	PlayerID    string       `json:"playerId"`
	RoundIndex  int          `json:"roundIndex"`
	Variety     string       `json:"variety"`
	Country     string       `json:"country"`
	Region      string       `json:"region"`
	Year        int          `json:"year"`
	Flavors     []FlavorNote `json:"flavors"`
	Rating      int          `json:"rating"` // 0 = unrated, 1–10
	SubmittedAt time.Time    `json:"submittedAt"`
}

type RoundScore struct {
	PlayerID     string `json:"playerId"`
	RoundIndex   int    `json:"roundIndex"`
	Points       int    `json:"points"`
	VarietyHit   bool   `json:"varietyHit"`
	CountryHit   bool   `json:"countryHit"`
	CountryPoints int   `json:"countryPoints"`
	RegionHit    bool   `json:"regionHit"`
	YearPoints   int    `json:"yearPoints"`
	FlavorPoints  int   `json:"flavorPoints"`
}

type LeaderboardEntry struct {
	Rank          int    `json:"rank"`
	PlayerID      string `json:"playerId"`
	PlayerName    string `json:"playerName"`
	Score         int    `json:"score"`
	MiniGameScore int    `json:"miniGameScore"`
	CombinedScore int    `json:"combinedScore"`
}

type WineConfig struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Variety string `json:"variety"`
	Country string `json:"country"`
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

type WineRatingSummary struct {
	RoundIndex  int     `json:"roundIndex"`
	WineName    string  `json:"wineName"`
	WineVariety string  `json:"wineVariety"`
	AvgRating   float64 `json:"avgRating"`
	RatedCount  int     `json:"ratedCount"`
	Variance    float64 `json:"variance"`
}

type GameSummary struct {
	MostPopular   *WineRatingSummary  `json:"mostPopular"`
	LeastLiked    *WineRatingSummary  `json:"leastLiked"`
	MostContested *WineRatingSummary  `json:"mostContested"`
	WineRatings   []WineRatingSummary `json:"wineRatings"`
}

type PlayerSummary struct {
	PlayerID           string  `json:"playerId"`
	FavoriteWine       string  `json:"favoriteWine"`
	FavoriteWineVariety string `json:"favoriteWineVariety"`
	FavoriteWineRound  int     `json:"favoriteWineRound"`
	BestRound          int     `json:"bestRound"`
	BestRoundPoints    int     `json:"bestRoundPoints"`
	VarietyHits        int     `json:"varietyHits"`
	TotalYearPoints    int     `json:"totalYearPoints"`
	AvgRatingGiven     float64 `json:"avgRatingGiven"`
	RoundsPlayed       int     `json:"roundsPlayed"`
}

type TimerState struct {
	DurationSecs int        `json:"durationSecs"`
	StartedAt    *time.Time `json:"startedAt,omitempty"`
	ElapsedSecs  int        `json:"elapsedSecs"`
	Running      bool       `json:"running"`
}

type GameState struct {
	Phase            Phase                      `json:"phase"`
	CurrentRound     int                        `json:"currentRound"`
	Rounds           []Round                    `json:"rounds"`
	Players          map[string]*Player         `json:"players"`
	Leaderboard      []LeaderboardEntry         `json:"leaderboard"`
	StartedAt        *time.Time                 `json:"startedAt,omitempty"`
	CompletedAt      *time.Time                 `json:"completedAt,omitempty"`
	Summary          *GameSummary               `json:"summary,omitempty"`
	PlayerSummaries  map[string]*PlayerSummary  `json:"playerSummaries,omitempty"`
	Timer            *TimerState                `json:"timer,omitempty"`
	MiniGameSchedule []int                      `json:"miniGameSchedule"`
	MiniGameConfigs  []MiniGameConfig           `json:"miniGameConfigs"`
	MiniGame         *MiniGameState             `json:"miniGame,omitempty"`
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
