// MessageType mirrors Go MessageType iota — NEVER reorder, append only
export enum MessageType {
  MsgJoin = 0,
  MsgGameState = 1,
  MsgError = 2,
  MsgGuessSubmit = 3,
  MsgAdminAction = 4,
  MsgPlayerList = 5,
  MsgMiniGameSubmit = 6,
}

// AdminActionType mirrors Go AdminActionType iota — NEVER reorder, append only
export enum AdminActionType {
  ActionStartGame = 0,
  ActionCloseGuessing = 1,
  ActionNextRound = 2,
  ActionSetScore = 3,
  ActionResetGame = 4,
  ActionSetTimer = 5,
  ActionStartTimer = 6,
  ActionPauseTimer = 7,
  ActionResetTimer = 8,
  ActionEndMiniGame = 9,
  ActionMiniGameNextQuestion = 10,
  ActionMiniGameRevealAnswer = 11,
  ActionEndMiniGameResults = 12,
  ActionMiniGameStartVoting = 13,
  ActionMiniGameReveal = 14,
  ActionMiniGameAdvance = 15,
  ActionEmojiExpireRound = 16,
  ActionEmojiNextRound = 17,
  ActionAdvanceIntro = 18,
}

export type Phase =
  | 'lobby'
  | 'game_intro'
  | 'tasting_intro'
  | 'guessing'
  | 'scoring'
  | 'complete'
  | 'minigame_intro'
  | 'minigame'
  | 'minigame_results'

export type Role = 'player' | 'admin'

export interface PlayerColor {
  name: string
  hex: string
}

export interface Player {
  id: string
  name: string
  role: Role
  connected: boolean
  joinedAt: string
  totalScore: number
  miniGameScore: number
  color: string
  avatar: string
}

export interface FlavorNote extends String {}

export interface Guess {
  playerId: string
  roundIndex: number
  variety: string
  country: string
  region: string
  year: number
  price: number
  flavors: string[]
  rating: number
  submittedAt: string
}

export interface RoundScore {
  playerId: string
  roundIndex: number
  points: number
  varietyHit: boolean
  countryHit: boolean
  countryPoints: number
  regionHit: boolean
  yearPoints: number
  flavorPoints: number
  flavorMatches: string[]
  pricePoints: number
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  playerName: string
  score: number
  miniGameScore: number
  combinedScore: number
}

export interface WineConfig {
  id: number
  name: string
  variety: string
  country: string
  region: string
  year: number
  hint: string
  flavors: string[]
  price: number
}

export interface Round {
  index: number
  wine: WineConfig
  guesses: Guess[]
  scores: RoundScore[]
  revealedAt?: string
}

export interface WineRatingSummary {
  roundIndex: number
  wineName: string
  wineVariety: string
  avgRating: number
  ratedCount: number
  variance: number
}

export interface GameSummary {
  mostPopular?: WineRatingSummary
  leastLiked?: WineRatingSummary
  mostContested?: WineRatingSummary
  wineRatings: WineRatingSummary[]
}

export interface PlayerSummary {
  playerId: string
  favoriteWine: string
  favoriteWineVariety: string
  favoriteWineRound: number
  bestRound: number
  bestRoundPoints: number
  varietyHits: number
  totalYearPoints: number
  avgRatingGiven: number
  roundsPlayed: number
}

export type WordleLetterState = 'correct' | 'present' | 'absent'

export interface WordleGuessResult {
  word: string
  states: WordleLetterState[]
}

export interface PlayerWordleState {
  guesses: WordleGuessResult[]
  solved: boolean
  points: number
}

export interface PlayerConnectionsState {
  foundGroups: string[]
  points: number
  incorrectGuesses: number
  totalGuesses: number
}

export interface PlayerTriviaState {
  answers: number[]
  points: number
}

export interface ConnectionsGroup {
  category: string
  color: 'yellow' | 'green' | 'blue' | 'purple'
  words: string[]
}

export interface TriviaQuestion {
  text: string
  options: string[]
  answer: string
  points: number
}

export interface FibbageQuestion {
  prompt: string
  answer: string
}

export interface FibbageSlot {
  id: number
  text: string
  playerId?: string
  isCorrect?: boolean
}

export interface PlayerFibbageState {
  submission: string
  votedFor: number
  points: number
  votedCorrect: boolean
  fooledCount: number
}

export interface QuiplashMatchup {
  playerA: string
  playerB: string
  prompt: string
}

export interface QuiplashSlot {
  id: number
  text: string
  playerId?: string
  votes?: number
}

export interface PlayerQuiplashState {
  submissions: Record<number, string>
  votes: Record<number, number>
  points: number
}

export interface QuiplashRoundResult {
  roundIndex: number
  playerA: string
  playerB: string
  prompt: string
  textA: string
  textB: string
  votesA: number
  votesB: number
  winnerId?: string
}

export interface EmojiRound {
  emoji: string
  answer: string
}

export interface PlayerEmojiState {
  roundWins: boolean[]
  points: number
}

export interface MiniGameConfig {
  type: 'wordle' | 'connections' | 'trivia' | 'fibbage' | 'quiplash' | 'emoji_decode'
  word?: string
  maxGuesses?: number
  groups?: ConnectionsGroup[]
  questions?: TriviaQuestion[]
  fibbageQuestions?: FibbageQuestion[]
  maxRounds?: number
  prompts?: string[]
  timerSeconds?: number
  emojiRounds?: EmojiRound[]
}

export interface MiniGameState {
  config: MiniGameConfig
  currentQuestion: number
  answerRevealed?: boolean
  subPhase?: string
  wordleStates?: Record<string, PlayerWordleState>
  connStates?: Record<string, PlayerConnectionsState>
  triviaStates?: Record<string, PlayerTriviaState>
  fibbageSlots?: FibbageSlot[]
  fibbageStates?: Record<string, PlayerFibbageState>
  quiplashMatchups?: QuiplashMatchup[]
  quiplashSlots?: QuiplashSlot[]
  quiplashStates?: Record<string, PlayerQuiplashState>
  quiplashResults?: QuiplashRoundResult[]
  emojiCorrectAnswerers?: string[]
  roundStartedAt?: string
  emojiStates?: Record<string, PlayerEmojiState>
}

export interface MiniGameAnswerPayload {
  wordleGuess?: string
  connGroup?: string[]
  triviaAnswerIndex?: number
  fibbageSubmission?: string
  fibbageVoteSlot?: number
  quiplashSubmission?: string
  quiplashVoteSlot?: number
  emojiAnswer?: string
}

export interface MiniGameWinner {
  gameType: string
  winnerIds: string[]
  points: number
}

export interface GameState {
  phase: Phase
  currentRound: number
  rounds: Round[]
  players: Record<string, Player>
  leaderboard: LeaderboardEntry[]
  startedAt?: string
  completedAt?: string
  summary?: GameSummary
  playerSummaries?: Record<string, PlayerSummary>
  timer?: TimerState
  miniGameSchedule: number[]
  miniGameConfigs: MiniGameConfig[]
  miniGame?: MiniGameState
  miniGameWinners?: MiniGameWinner[]
  colors: PlayerColor[]
}

export interface Envelope<T = unknown> {
  type: MessageType
  payload: T
}

export interface JoinPayload {
  playerId: string
  name: string
  password?: string
  color?: string
  avatar?: string
}

export interface GuessPayload {
  variety: string
  country: string
  region: string
  year: number
  price: number
  flavors: string[]
  rating: number
}

export interface TimerState {
  durationSecs: number
  startedAt?: string
  elapsedSecs: number
  running: boolean
}

export interface AdminActionPayload {
  action: AdminActionType
  playerId?: string
  score?: number
  durationSecs?: number
}
