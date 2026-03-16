import { useState, FormEvent } from 'react'
import { PlayerList } from '../components/PlayerList'
import { Leaderboard } from '../components/Leaderboard'
import { useGameStore } from '../store/gameStore'
import { AdminActionType } from '../types/game'
import type { AdminActionPayload } from '../types/game'

interface Props {
  playerId: string
  sendJoin: (payload: { playerId: string; name: string; password?: string }) => void
  sendAdminAction: (payload: AdminActionPayload) => void
}

export function AdminView({ playerId, sendJoin, sendAdminAction }: Props) {
  const { store } = useGameStore()
  const { gameState, connected, error } = store
  const [password, setPassword] = useState('')
  const [hasJoined, setHasJoined] = useState(false)
  const [editScores, setEditScores] = useState<Record<string, string>>({})

  const me = gameState?.players[playerId]
  const isAdmin = me?.role === 'admin'

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    sendJoin({ playerId, name: 'Admin', password })
    setHasJoined(true)
  }

  function action(a: AdminActionType, extra?: Partial<AdminActionPayload>) {
    sendAdminAction({ action: a, ...extra })
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-bold text-muted animate-pulse">Connecting...</p>
      </div>
    )
  }

  // Auth screen
  if (!hasJoined || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6">
        <div className="text-6xl">🔑</div>
        <h1 className="text-3xl font-black">Admin Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-sm">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sketch-border px-4 py-3 font-semibold bg-white w-full"
            autoFocus
          />
          <button type="submit" className="btn-sketch bg-ink text-paper text-lg w-full">
            Login
          </button>
        </form>
        {error && <p className="text-coral font-bold">{error}</p>}
        {hasJoined && !isAdmin && (
          <p className="text-coral font-bold">Wrong password — try again</p>
        )}
      </div>
    )
  }

  if (!gameState) return null

  const players = Object.values(gameState.players).filter((p) => p.role === 'player')
  const currentRound = gameState.rounds[gameState.currentRound]

  return (
    <div className="min-h-screen bg-paper px-6 py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black">Admin Panel 🍷</h1>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-lime' : 'bg-coral'}`} />
          <span className="font-bold text-sm text-muted">
            Phase: <span className="text-ink capitalize">{gameState.phase}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="sketch-border bg-coral/20 px-4 py-3 mb-4">
          <p className="font-bold text-coral">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div className="sketch-border bg-white px-4 py-4">
            <p className="font-black text-lg mb-3">Game Controls</p>
            <div className="flex flex-col gap-2">
              {gameState.phase === 'lobby' && (
                <button
                  className="btn-sketch bg-lime text-ink w-full"
                  onClick={() => action(AdminActionType.ActionStartGame)}
                >
                  Start Game ▶️
                </button>
              )}
              {gameState.phase === 'guessing' && (
                <button
                  className="btn-sketch bg-coral text-white w-full"
                  onClick={() => action(AdminActionType.ActionCloseGuessing)}
                >
                  Close Guessing 🔒
                </button>
              )}
              {gameState.phase === 'scoring' && (
                <button
                  className="btn-sketch bg-sky text-ink w-full"
                  onClick={() => action(AdminActionType.ActionNextRound)}
                >
                  {gameState.currentRound + 1 >= gameState.rounds.length
                    ? 'Finish Game 🏁'
                    : 'Next Round ➡️'}
                </button>
              )}
              <button
                className="btn-sketch bg-paper text-muted border-muted/40 w-full text-sm"
                onClick={() => {
                  if (confirm('Reset game? This will clear all data.')) {
                    action(AdminActionType.ActionResetGame)
                  }
                }}
              >
                Reset Game 🔄
              </button>
            </div>
          </div>

          {currentRound && (
            <div className="sketch-border bg-white px-4 py-4">
              <p className="font-black text-lg mb-1">
                Current Round: #{gameState.currentRound + 1}
              </p>
              <p className="font-semibold text-muted">{currentRound.wine.variety}</p>
              <p className="text-sm text-muted">{currentRound.wine.region}, {currentRound.wine.year}</p>
              <p className="text-sm font-bold text-grape mt-2">
                {currentRound.guesses.length} / {players.length} guesses
              </p>
            </div>
          )}
        </div>

        {/* Players + scores */}
        <div className="flex flex-col gap-4">
          <div className="sketch-border bg-white px-4 py-4">
            <PlayerList players={Object.values(gameState.players)} />
          </div>

          {/* Score editor */}
          <div className="sketch-border bg-white px-4 py-4">
            <p className="font-black text-lg mb-3">Edit Scores</p>
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 mb-2">
                <span className="flex-1 font-semibold truncate text-sm">{p.name}</span>
                <input
                  type="number"
                  className="sketch-border px-2 py-1 w-20 text-sm font-bold"
                  value={editScores[p.id] ?? p.totalScore}
                  onChange={(e) => setEditScores((s) => ({ ...s, [p.id]: e.target.value }))}
                />
                <button
                  className="btn-sketch bg-sunny text-ink text-xs px-2 py-1"
                  onClick={() => {
                    const val = parseInt(editScores[p.id] ?? String(p.totalScore), 10)
                    if (!isNaN(val)) {
                      action(AdminActionType.ActionSetScore, { playerId: p.id, score: val })
                    }
                  }}
                >
                  Set
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mt-6 sketch-border bg-white px-4 py-4">
        <p className="font-black text-lg mb-3">Leaderboard</p>
        <Leaderboard entries={gameState.leaderboard} />
      </div>
    </div>
  )
}
