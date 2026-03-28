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
	FoundGroups      []string `json:"foundGroups"`
	Points           int      `json:"points"`
	IncorrectGuesses int      `json:"incorrectGuesses"`
	TotalGuesses     int      `json:"totalGuesses"`
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

type FibbageQuestion struct {
	Prompt string `json:"prompt"`
	Answer string `json:"answer"`
}

type FibbageSlot struct {
	ID        int    `json:"id"`
	Text      string `json:"text"`
	PlayerID  string `json:"playerId,omitempty"`
	IsCorrect bool   `json:"isCorrect,omitempty"`
}

type PlayerFibbageState struct {
	Submission   string `json:"submission"`
	VotedFor     int    `json:"votedFor"`
	Points       int    `json:"points"`
	VotedCorrect bool   `json:"votedCorrect"`
	FooledCount  int    `json:"fooledCount"`
}

type QuiplashMatchup struct {
	PlayerA string `json:"playerA"`
	PlayerB string `json:"playerB"`
	Prompt  string `json:"prompt"`
}

type QuiplashSlot struct {
	ID       int    `json:"id"`
	Text     string `json:"text"`
	PlayerID string `json:"playerId,omitempty"`
	Votes    int    `json:"votes,omitempty"`
}

type PlayerQuiplashState struct {
	Submissions map[int]string `json:"submissions"`
	Votes       map[int]int    `json:"votes"`
	Points      int            `json:"points"`
}

type EmojiRound struct {
	Emoji  string `json:"emoji"`
	Answer string `json:"answer"`
}

type PlayerEmojiState struct {
	RoundWins []bool `json:"roundWins"`
	Points    int    `json:"points"`
}

type MiniGameConfig struct {
	Type             string             `json:"type"`
	Word             string             `json:"word,omitempty"`
	MaxGuesses       int                `json:"maxGuesses,omitempty"`
	Groups           []ConnectionsGroup `json:"groups,omitempty"`
	Questions        []TriviaQuestion   `json:"questions,omitempty"`
	FibbageQuestions []FibbageQuestion  `json:"fibbageQuestions,omitempty"`
	MaxRounds        int                `json:"maxRounds,omitempty"`
	Prompts          []string           `json:"prompts,omitempty"`
	TimerSeconds     int                `json:"timerSeconds,omitempty"`
	EmojiRounds      []EmojiRound       `json:"emojiRounds,omitempty"`
}

type MiniGameState struct {
	Config          MiniGameConfig                      `json:"config"`
	CurrentQuestion int                                 `json:"currentQuestion"`
	AnswerRevealed  bool                                `json:"answerRevealed"`
	SubPhase        string                              `json:"subPhase,omitempty"`
	WordleStates    map[string]*PlayerWordleState       `json:"wordleStates,omitempty"`
	ConnStates      map[string]*PlayerConnectionsState  `json:"connStates,omitempty"`
	TriviaStates    map[string]*PlayerTriviaState       `json:"triviaStates,omitempty"`
	FibbageSlots    []FibbageSlot                       `json:"fibbageSlots,omitempty"`
	FibbageStates   map[string]*PlayerFibbageState      `json:"fibbageStates,omitempty"`
	QuiplashMatchups []QuiplashMatchup                  `json:"quiplashMatchups,omitempty"`
	QuiplashSlots   []QuiplashSlot                      `json:"quiplashSlots,omitempty"`
	QuiplashStates  map[string]*PlayerQuiplashState     `json:"quiplashStates,omitempty"`
	EmojiRoundWinner string                             `json:"emojiRoundWinner,omitempty"`
	RoundStartedAt  *time.Time                          `json:"roundStartedAt,omitempty"`
	EmojiStates     map[string]*PlayerEmojiState        `json:"emojiStates,omitempty"`
}

type MiniGameAnswer struct {
	WordleGuess        string
	ConnGroup          []string
	TriviaAnswerIndex  int
	FibbageSubmission  string
	FibbageVoteSlot    int
	QuiplashSubmission string
	QuiplashVoteSlot   int
	EmojiAnswer        string
}

type Phase string

const (
	PhaseLobby           Phase = "lobby"
	PhaseGuessing        Phase = "guessing"
	PhaseScoring         Phase = "scoring"
	PhaseComplete        Phase = "complete"
	PhaseMiniGame        Phase = "minigame"
	PhaseMiniGameResults Phase = "minigame_results"
)

type Role string

const (
	RolePlayer Role = "player"
	RoleAdmin  Role = "admin"
)

type PlayerColor struct {
	Name string `json:"name"`
	Hex  string `json:"hex"`
}

type Player struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Role          Role      `json:"role"`
	Connected     bool      `json:"connected"`
	JoinedAt      time.Time `json:"joinedAt"`
	TotalScore    int       `json:"totalScore"`
	MiniGameScore int       `json:"miniGameScore"`
	Color         string    `json:"color"`
	Avatar        string    `json:"avatar"`
}

type FlavorNote string

type Guess struct {
	PlayerID    string       `json:"playerId"`
	RoundIndex  int          `json:"roundIndex"`
	Variety     string       `json:"variety"`
	Country     string       `json:"country"`
	Region      string       `json:"region"`
	Year        int          `json:"year"`
	Price       int          `json:"price"`
	Flavors     []FlavorNote `json:"flavors"`
	Rating      int          `json:"rating"` // 0 = unrated, 1–10
	SubmittedAt time.Time    `json:"submittedAt"`
}

type RoundScore struct {
	PlayerID      string   `json:"playerId"`
	RoundIndex    int      `json:"roundIndex"`
	Points        int      `json:"points"`
	VarietyHit    bool     `json:"varietyHit"`
	CountryHit    bool     `json:"countryHit"`
	CountryPoints int      `json:"countryPoints"`
	RegionHit     bool     `json:"regionHit"`
	YearPoints    int      `json:"yearPoints"`
	FlavorPoints  int      `json:"flavorPoints"`
	FlavorMatches []string `json:"flavorMatches"`
	PricePoints   int      `json:"pricePoints"`
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
	ID      int      `json:"id"`
	Name    string   `json:"name"`
	Variety string   `json:"variety"`
	Country string   `json:"country"`
	Region  string   `json:"region"`
	Year    int      `json:"year"`
	Hint    string   `json:"hint"`
	Flavors []string `json:"flavors"`
	Price   int      `json:"price"`
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
	Colors           []PlayerColor              `json:"colors"`
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
