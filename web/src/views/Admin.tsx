import { useState, useEffect, FormEvent } from 'react'
import { PlayerList } from '../components/PlayerList'
import { CountdownTimer } from '../components/CountdownTimer'
import { useGameStore } from '../store/gameStore'
import { AdminActionType } from '../types/game'
import type { AdminActionPayload } from '../types/game'

const ADMIN_ID_KEY = 'wineparty_admin_id'
const ADMIN_PW_KEY = 'wineparty_admin_password'

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b, i) => {
      const hex = b.toString(16).padStart(2, '0')
      return [4, 6, 8, 10].includes(i) ? '-' + hex : hex
    })
    .join('')
}

function getOrCreateAdminId(): string {
  let id = localStorage.getItem(ADMIN_ID_KEY)
  if (!id) {
    id = generateId()
    localStorage.setItem(ADMIN_ID_KEY, id)
  }
  return id
}

interface Props {
  sendJoin: (payload: { playerId: string; name: string; password?: string }) => void
  sendAdminAction: (payload: AdminActionPayload) => void
}

export function AdminView({ sendJoin, sendAdminAction }: Props) {
  const { store } = useGameStore()
  const { gameState, connected, error } = store
  const [adminId] = useState<string>(getOrCreateAdminId)
  const [password, setPassword] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [editScores, setEditScores] = useState<Record<string, string>>({})
  const [showWineInfo, setShowWineInfo] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(5)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const me = gameState?.players[adminId]
  const isAdmin = me?.role === 'admin'

  // Auto-join with stored password when connected
  useEffect(() => {
    if (!connected) return
    const stored = localStorage.getItem(ADMIN_PW_KEY)
    if (stored) {
      sendJoin({ playerId: adminId, name: 'Admin', password: stored })
    }
  }, [connected, adminId])

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    sendJoin({ playerId: adminId, name: 'Admin', password })
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_PW_KEY)
    localStorage.removeItem(ADMIN_ID_KEY)
    window.location.reload()
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

  // Auth screen — shown until server confirms admin role
  if (!isAdmin) {
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
        {attempted && error && <p className="text-coral font-bold">{error}</p>}
      </div>
    )
  }

  // Store password on successful auth (first time)
  if (!localStorage.getItem(ADMIN_PW_KEY) && password) {
    localStorage.setItem(ADMIN_PW_KEY, password)
  }

  if (!gameState) return null

  const players = Object.values(gameState.players).filter((p) => p.role === 'player')
  const currentRound = gameState.rounds[gameState.currentRound]
  const timer = gameState.timer

  const APP_NAME = 'Wine Party'

  return (
    <div className="min-h-screen bg-paper px-6 py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-grape">{APP_NAME}</span>
          <h1 className="text-3xl font-black">Admin Panel 🍷</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-lime' : 'bg-coral'}`} />
          <span className="font-bold text-sm text-muted">
            Phase: <span className="text-ink capitalize">{gameState.phase}</span>
          </span>
          <button
            className="btn-sketch bg-paper text-muted text-sm px-3 py-1"
            onClick={handleLogout}
          >
            Log out
          </button>
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
                  {gameState.currentRound + 1 >= gameState.rounds.length &&
                  !gameState.miniGameSchedule.includes(gameState.currentRound)
                    ? 'Finish Game 🏁'
                    : 'Next Round ➡️'}
                </button>
              )}
              {gameState.phase === 'minigame' && gameState.miniGame && (
                <>
                  <div className="sketch-border-sky bg-sky/10 px-3 py-2 text-center">
                    <p className="font-bold text-sm text-muted uppercase tracking-wider">Mini Game</p>
                    <p className="font-black text-ink capitalize">{gameState.miniGame.config.type}</p>
                  </div>
                  {gameState.miniGame.config.type === 'trivia' && (() => {
                    const mg = gameState.miniGame!
                    const questions = mg.config.questions ?? []
                    const isLast = mg.currentQuestion >= questions.length - 1
                    return (
                      <>
                        <button
                          className="btn-sketch bg-sunny text-ink w-full disabled:opacity-40"
                          disabled={mg.answerRevealed}
                          onClick={() => action(AdminActionType.ActionMiniGameRevealAnswer)}
                        >
                          Reveal Answer
                        </button>
                        <button
                          className="btn-sketch bg-sky text-ink w-full disabled:opacity-40"
                          disabled={isLast || !mg.answerRevealed}
                          onClick={() => action(AdminActionType.ActionMiniGameNextQuestion)}
                        >
                          Next Question →
                        </button>
                      </>
                    )
                  })()}
                  {(gameState.miniGame.config.type === 'fibbage' || gameState.miniGame.config.type === 'quiplash') && (() => {
                    const mg = gameState.miniGame!
                    const subPhase = mg.subPhase ?? 'submitting'
                    const isFibbage = mg.config.type === 'fibbage'
                    const matchups = mg.quiplashMatchups ?? []
                    const totalItems = isFibbage
                      ? (mg.config.fibbageQuestions?.length ?? 0)
                      : matchups.length
                    const isLastItem = mg.currentQuestion >= totalItems - 1
                    const currentMatchup = matchups[mg.currentQuestion]
                    const submittedCount = isFibbage
                      ? Object.values(mg.fibbageStates ?? {}).filter((s) => s.submission !== '').length
                      : (() => {
                          if (!currentMatchup) return 0
                          const stateA = mg.quiplashStates?.[currentMatchup.playerA]
                          const stateB = mg.quiplashStates?.[currentMatchup.playerB]
                          return (stateA?.submissions?.[mg.currentQuestion] !== undefined ? 1 : 0) +
                                 (stateB?.submissions?.[mg.currentQuestion] !== undefined ? 1 : 0)
                        })()
                    const totalSubmitters = isFibbage
                      ? Object.keys(mg.fibbageStates ?? {}).length
                      : 2
                    const noMatchups = !isFibbage && matchups.length === 0
                    if (noMatchups) {
                      return (
                        <div className="text-sm font-bold text-coral text-center">
                          Not enough players for Quiplash (need 2+)
                        </div>
                      )
                    }
                    return (
                      <>
                        <div className="text-xs font-bold text-muted text-center">
                          {subPhase === 'submitting' && `${submittedCount} / ${totalSubmitters} submitted`}
                          {subPhase === 'voting' && (() => {
                            if (isFibbage) return 'Voting in progress'
                            const qs = mg.quiplashStates ?? {}
                            const allMatchedIds = new Set(matchups.flatMap((m) => [m.playerA, m.playerB]))
                            const voterIds = Object.keys(qs).filter((id) => !allMatchedIds.has(id))
                            const votedCount = voterIds.filter(
                              (id) => qs[id]?.votes?.[mg.currentQuestion] !== undefined
                            ).length
                            return `${votedCount} / ${voterIds.length} voted`
                          })()}
                          {subPhase === 'revealing' && 'Results shown'}
                        </div>
                        <button
                          className="btn-sketch bg-sunny text-ink w-full disabled:opacity-40"
                          disabled={subPhase !== 'submitting'}
                          onClick={() => action(AdminActionType.ActionMiniGameStartVoting)}
                        >
                          Start Voting
                        </button>
                        <button
                          className="btn-sketch bg-sky text-ink w-full disabled:opacity-40"
                          disabled={subPhase !== 'voting'}
                          onClick={() => action(AdminActionType.ActionMiniGameReveal)}
                        >
                          Reveal
                        </button>
                        <button
                          className="btn-sketch bg-grape text-white w-full disabled:opacity-40"
                          disabled={subPhase !== 'revealing' || isLastItem}
                          onClick={() => action(AdminActionType.ActionMiniGameAdvance)}
                        >
                          {isFibbage ? 'Next Question →' : 'Next Round →'}
                        </button>
                      </>
                    )
                  })()}
                  {gameState.miniGame.config.type === 'emoji_decode' && (() => {
                    const mg = gameState.miniGame!
                    const subPhase = mg.subPhase ?? 'active'
                    const totalRounds = mg.config.emojiRounds?.length ?? 0
                    const isLastRound = mg.currentQuestion >= totalRounds - 1
                    const roundDone = subPhase === 'round_expired'
                    const correctCount = mg.emojiCorrectAnswerers?.length ?? 0
                    return (
                      <>
                        <div className="text-xs font-bold text-muted text-center">
                          Round {mg.currentQuestion + 1} of {totalRounds} — {subPhase.replace('_', ' ')}
                          {subPhase === 'active' && correctCount > 0 && ` · ${correctCount} correct`}
                        </div>
                        <button
                          className="btn-sketch bg-coral text-white w-full disabled:opacity-40"
                          disabled={subPhase !== 'active'}
                          onClick={() => action(AdminActionType.ActionEmojiExpireRound)}
                        >
                          Expire Round
                        </button>
                        <button
                          className="btn-sketch bg-sky text-ink w-full disabled:opacity-40"
                          disabled={!roundDone || isLastRound}
                          onClick={() => action(AdminActionType.ActionEmojiNextRound)}
                        >
                          Next Round →
                        </button>
                      </>
                    )
                  })()}
                  <button
                    className="btn-sketch bg-coral text-white w-full"
                    onClick={() => action(AdminActionType.ActionEndMiniGame)}
                  >
                    End Mini-Game → Results
                  </button>
                </>
              )}
              {gameState.phase === 'minigame_results' && (
                <>
                  <div className="sketch-border-sky bg-sky/10 px-3 py-2 text-center">
                    <p className="font-bold text-sm text-muted uppercase tracking-wider">Mini-Game Results</p>
                  </div>
                  <button
                    className="btn-sketch bg-lime text-ink w-full"
                    onClick={() => action(AdminActionType.ActionEndMiniGameResults)}
                  >
                    Continue →
                  </button>
                </>
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
              <div className="flex items-center justify-between mb-1">
                <p className="font-black text-lg">
                  Current Round: #{gameState.currentRound + 1}
                </p>
                <button
                  className="text-xs font-bold px-2 py-1 sketch-border text-muted"
                  onClick={() => setShowWineInfo((v) => !v)}
                >
                  {showWineInfo ? 'Hide info' : 'Reveal info'}
                </button>
              </div>
              {showWineInfo ? (
                <>
                  <p className="font-semibold text-ink">{currentRound.wine.name}</p>
                  <p className="font-semibold text-muted">{currentRound.wine.variety}</p>
                  <p className="text-sm text-muted">{currentRound.wine.region}, {currentRound.wine.year}</p>
                </>
              ) : (
                <p className="text-sm text-muted italic">Wine info hidden — click Reveal info to show</p>
              )}
              <p className="text-sm font-bold text-grape mt-2">
                {currentRound.guesses.length} / {players.length} guesses
              </p>
            </div>
          )}

          {/* Timer controls — guessing and minigame phases */}
          {(gameState.phase === 'guessing' || gameState.phase === 'minigame') && (
            <div className="sketch-border-sunny bg-sunny/10 px-4 py-4">
              <p className="font-black text-lg mb-3">Timer</p>

              {timer && timer.durationSecs > 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <CountdownTimer timer={timer} size="sm" />
                  <div className="flex gap-2 w-full">
                    <button
                      className="btn-sketch flex-1 text-sm bg-lime text-ink"
                      onClick={() => action(timer.running ? AdminActionType.ActionPauseTimer : AdminActionType.ActionStartTimer)}
                    >
                      {timer.running ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      className="btn-sketch flex-1 text-sm bg-paper text-muted"
                      onClick={() => action(AdminActionType.ActionResetTimer)}
                    >
                      Reset
                    </button>
                    <button
                      className="btn-sketch flex-1 text-sm bg-coral text-white"
                      onClick={() => action(AdminActionType.ActionSetTimer, { durationSecs: 0 })}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-bold text-muted">Minutes</label>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(Math.max(0, Math.min(99, Number(e.target.value))))}
                        className="sketch-border px-2 py-2 font-bold text-center w-full"
                      />
                    </div>
                    <span className="font-black text-xl mt-4">:</span>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-bold text-muted">Seconds</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
                        className="sketch-border px-2 py-2 font-bold text-center w-full"
                      />
                    </div>
                  </div>
                  <button
                    className="btn-sketch bg-sunny text-ink w-full font-bold"
                    onClick={() => {
                      const secs = timerMinutes * 60 + timerSeconds
                      if (secs > 0) {
                        action(AdminActionType.ActionSetTimer, { durationSecs: secs })
                      }
                    }}
                  >
                    Set Timer
                  </button>
                  <button
                    className="btn-sketch bg-lime text-ink w-full font-bold text-sm"
                    onClick={() => {
                      const secs = timerMinutes * 60 + timerSeconds
                      if (secs > 0) {
                        action(AdminActionType.ActionSetTimer, { durationSecs: secs })
                        setTimeout(() => action(AdminActionType.ActionStartTimer), 50)
                      }
                    }}
                  >
                    Set &amp; Start
                  </button>
                </div>
              )}
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{p.name}</p>
                  <p className="text-xs text-muted">wine: {p.totalScore} + mini: {p.miniGameScore}</p>
                </div>
                <input
                  type="number"
                  className="sketch-border px-2 py-1 w-20 text-sm font-bold"
                  value={editScores[p.id] ?? String(p.totalScore + p.miniGameScore)}
                  onChange={(e) => setEditScores((s) => ({ ...s, [p.id]: e.target.value }))}
                />
                <button
                  className="btn-sketch bg-sunny text-ink text-xs px-2 py-1"
                  onClick={() => {
                    const combined = parseInt(editScores[p.id] ?? String(p.totalScore + p.miniGameScore), 10)
                    if (!isNaN(combined)) {
                      action(AdminActionType.ActionSetScore, { playerId: p.id, score: combined - p.miniGameScore })
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


    </div>
  )
}
