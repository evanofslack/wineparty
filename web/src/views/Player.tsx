import { useState } from 'react'
import { BlindTastingForm } from '../components/BlindTastingForm'
import { Leaderboard } from '../components/Leaderboard'
import { useGameStore } from '../store/gameStore'
import type { GuessPayload } from '../types/game'

interface Props {
  playerId: string
  playerName: string
  setPlayerName: (name: string) => void
  sendJoin: (payload: { playerId: string; name: string; password?: string }) => void
  sendGuess: (payload: GuessPayload) => void
}

export function PlayerView({ playerId, playerName, setPlayerName, sendJoin, sendGuess }: Props) {
  const { store } = useGameStore()
  const { gameState, connected, error } = store
  const [nameInput, setNameInput] = useState(playerName)
  const [hasJoined, setHasJoined] = useState(false)
  const [submittedRound, setSubmittedRound] = useState<number | null>(null)

  const me = gameState?.players[playerId]
  const currentRound = gameState ? gameState.rounds[gameState.currentRound] : null
  const myGuess = currentRound?.guesses.find((g) => g.playerId === playerId)
  const myScore = currentRound?.scores.find((s) => s.playerId === playerId)

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return
    setPlayerName(nameInput.trim())
    sendJoin({ playerId, name: nameInput.trim() })
    setHasJoined(true)
  }

  function handleGuess(payload: GuessPayload) {
    sendGuess(payload)
    setSubmittedRound(gameState?.currentRound ?? null)
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <div className="text-5xl animate-pulse">🍷</div>
        <p className="font-bold text-muted text-lg">Connecting...</p>
      </div>
    )
  }

  // Name entry / join screen
  if (!hasJoined || !me) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
        <div className="text-6xl">🍷</div>
        <h1 className="text-3xl font-black text-ink text-center">Wine Party!</h1>
        <form onSubmit={handleJoin} className="w-full max-w-xs flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="sketch-border px-4 py-4 text-lg font-bold bg-white w-full"
            maxLength={24}
            autoFocus
          />
          <button type="submit" className="btn-sketch bg-coral text-white text-lg w-full">
            Join Game 🎉
          </button>
        </form>
        {error && <p className="text-coral font-bold text-center">{error}</p>}
      </div>
    )
  }

  // Lobby
  if (gameState?.phase === 'lobby') {
    const playerCount = Object.values(gameState.players).filter((p) => p.role === 'player').length
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <div className="text-6xl">🥂</div>
        <h1 className="text-3xl font-black">Welcome, {me.name}!</h1>
        <div className="sketch-border bg-white px-6 py-4 w-full max-w-sm">
          <p className="text-muted font-semibold">Waiting for host to start...</p>
          <p className="text-xl font-black text-grape mt-2">{playerCount} player{playerCount !== 1 ? 's' : ''} ready</p>
        </div>
        {error && <p className="text-coral font-bold">{error}</p>}
      </div>
    )
  }

  // Guessing phase
  if (gameState?.phase === 'guessing' && currentRound) {
    const submittedThisRound = myGuess !== undefined || submittedRound === gameState.currentRound
    return (
      <div className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-ink">
            Wine #{gameState.currentRound + 1} of {gameState.rounds.length}
          </h2>
          <span className="sketch-border px-2 py-1 text-sm font-bold text-grape bg-white">
            {me.totalScore}pt
          </span>
        </div>
        <BlindTastingForm
          onSubmit={handleGuess}
          submitted={submittedThisRound}
        />
        {error && <p className="text-coral font-bold mt-4 text-center">{error}</p>}
      </div>
    )
  }

  // Scoring phase
  if (gameState?.phase === 'scoring' && currentRound) {
    return (
      <div className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-md mx-auto">
        <h2 className="text-2xl font-black mb-4 text-center">Results! 🎉</h2>

        {/* The wine reveal */}
        <div className="sketch-border bg-grape text-white px-4 py-4 mb-4">
          <p className="text-sm font-bold opacity-70">The wine was...</p>
          <p className="text-xl font-black">{currentRound.wine.name}</p>
          <p className="text-lg font-bold mt-0.5">{currentRound.wine.variety}</p>
          <p className="font-semibold">{currentRound.wine.country} · {currentRound.wine.region}, {currentRound.wine.year}</p>
        </div>

        {/* My score */}
        {myScore && (
          <div className="sketch-border bg-white px-4 py-4 mb-4">
            <p className="text-sm font-bold text-muted mb-2">Your score this round</p>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-grape">+{myScore.points}</span>
              <div className="text-sm font-semibold space-y-0.5 text-muted">
                {myScore.varietyHit && <p>✅ Variety correct (+3)</p>}
                {myScore.countryHit && <p>✅ Country correct (+1)</p>}
                {myScore.regionHit && <p>✅ Region correct (+2)</p>}
                {myScore.yearPoints > 0 && <p>📅 Year {myScore.yearPoints === 3 ? 'exact' : myScore.yearPoints === 2 ? '1yr off' : '2yr off'} (+{myScore.yearPoints})</p>}
                {myScore.flavorPoints > 0 && <p>👃 Flavors (+{myScore.flavorPoints})</p>}
              </div>
            </div>
          </div>
        )}
        {!myScore && myGuess === undefined && (
          <div className="sketch-border bg-sunny/30 px-4 py-3 mb-4">
            <p className="font-semibold text-muted">You didn't submit a guess this round.</p>
          </div>
        )}

        <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Leaderboard</p>
        <Leaderboard entries={gameState.leaderboard} highlightId={playerId} />

        <p className="text-center text-muted font-semibold mt-6">Waiting for next round...</p>
      </div>
    )
  }

  // Complete phase
  if (gameState?.phase === 'complete') {
    const winner = gameState.leaderboard[0]
    const isWinner = winner?.playerId === playerId
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center">
        <div className="text-6xl">{isWinner ? '🏆' : '🍷'}</div>
        <h1 className="text-3xl font-black">
          {isWinner ? 'You won! 🎉' : 'Game Over!'}
        </h1>
        {winner && (
          <div className="sketch-border-lg bg-sunny/50 px-6 py-4 w-full max-w-sm">
            <p className="text-sm font-bold text-muted">Winner</p>
            <p className="text-2xl font-black">{winner.playerName}</p>
            <p className="text-lg font-bold text-grape">{winner.score} points</p>
          </div>
        )}
        <div className="w-full max-w-sm">
          <Leaderboard entries={gameState.leaderboard} highlightId={playerId} />
        </div>
      </div>
    )
  }

  // Mini-game placeholder
  if (gameState?.phase === 'minigame') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-5xl">🎮</div>
        <p className="text-xl font-black">Mini Game!</p>
        <p className="text-muted font-semibold">Coming soon...</p>
      </div>
    )
  }

  return null
}
