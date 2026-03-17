// MessageType mirrors Go MessageType iota — NEVER reorder, append only
export enum MessageType {
  MsgJoin = 0,
  MsgGameState = 1,
  MsgError = 2,
  MsgGuessSubmit = 3,
  MsgAdminAction = 4,
  MsgPlayerList = 5,
}

// AdminActionType mirrors Go AdminActionType iota — NEVER reorder, append only
export enum AdminActionType {
  ActionStartGame = 0,
  ActionCloseGuessing = 1,
  ActionNextRound = 2,
  ActionSetScore = 3,
  ActionResetGame = 4,
}

export type Phase =
  | 'lobby'
  | 'guessing'
  | 'scoring'
  | 'complete'
  | 'minigame'

export type Role = 'player' | 'admin'

export interface Player {
  id: string
  name: string
  role: Role
  connected: boolean
  joinedAt: string
  totalScore: number
}

export interface FlavorNote extends String {}

export interface Guess {
  playerId: string
  roundIndex: number
  variety: string
  country: string
  region: string
  year: number
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
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  playerName: string
  score: number
}

export interface WineConfig {
  id: number
  name: string
  variety: string
  country: string
  region: string
  year: number
  hint: string
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
}

export interface Envelope<T = unknown> {
  type: MessageType
  payload: T
}

export interface JoinPayload {
  playerId: string
  name: string
  password?: string
}

export interface GuessPayload {
  variety: string
  country: string
  region: string
  year: number
  flavors: string[]
  rating: number
}

export interface AdminActionPayload {
  action: AdminActionType
  playerId?: string
  score?: number
}
