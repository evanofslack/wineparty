import { useState, useEffect } from 'react'
import { BlindTastingForm } from '../components/BlindTastingForm'
import { TriviaGame } from '../components/minigames/TriviaGame'
import { WordleGame } from '../components/minigames/WordleGame'
import { ConnectionsGame } from '../components/minigames/ConnectionsGame'
import { FibbageGame } from '../components/minigames/FibbageGame'
import { QuiplashGame } from '../components/minigames/QuiplashGame'
import { EmojiDecodeGame } from '../components/minigames/EmojiDecodeGame'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { useGameStore } from '../store/gameStore'
import type { JoinPayload, GuessPayload, MiniGameAnswerPayload } from '../types/game'

const MAX_PAINTED = 32

interface Props {
  playerId: string
  playerName: string
  setPlayerName: (name: string) => void
  sendJoin: (payload: JoinPayload) => void
  sendGuess: (payload: GuessPayload) => void
  sendMiniGameAnswer: (payload: MiniGameAnswerPayload) => void
}

export function PlayerView({ playerId, playerName, setPlayerName, sendJoin, sendGuess, sendMiniGameAnswer }: Props) {
  const { store } = useGameStore()
  const { gameState, connected, error } = store
  const [nameInput, setNameInput] = useState(playerName)
  const [hasJoined, setHasJoined] = useState(false)
  const [submittedRound, setSubmittedRound] = useState<number | null>(null)

  // Join wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [avatarCells, setAvatarCells] = useState<number[]>(() => Array(64).fill(0))

  useEffect(() => {
    setSubmittedRound(null)
  }, [gameState?.startedAt])

  const me = gameState?.players[playerId]
  const currentRound = gameState ? gameState.rounds[gameState.currentRound] : null
  const myGuess = currentRound?.guesses.find((g) => g.playerId === playerId)
  const myScore = currentRound?.scores.find((s) => s.playerId === playerId)
  const colors = gameState?.colors ?? []

  const paintedCount = avatarCells.filter((c) => c !== 0).length

  function handleNameNext(e: React.FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return
    setPlayerName(nameInput.trim())
    setStep(2)
  }

  function handleColorNext(hex: string) {
    setSelectedColor(hex)
    setStep(3)
  }

  function toggleCell(i: number) {
    setAvatarCells((prev) => {
      const next = [...prev]
      if (prev[i] === 0) {
        if (paintedCount >= MAX_PAINTED) return prev
        next[i] = 1
      } else if (prev[i] === 1) {
        next[i] = 2
      } else {
        next[i] = 0
      }
      return next
    })
  }

  function handleJoinConfirm() {
    const lobbyToken = new URLSearchParams(window.location.search).get('lobby') ?? ''
    sendJoin({
      playerId,
      name: nameInput.trim(),
      color: selectedColor,
      avatar: avatarCells.join(''),
      lobbyToken,
    })
    setHasJoined(true)
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <div className="text-5xl animate-pulse">🍷</div>
        <p className="font-bold text-muted text-lg">Connecting...</p>
      </div>
    )
  }

  // Join wizard
  if (!hasJoined || !me) {
    // Step 1: Name
    if (step === 1) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
          <div className="text-6xl">🍷</div>
          <h1 className="text-3xl font-black text-ink text-center">Wine Party!</h1>
          <p className="text-sm font-bold text-muted uppercase tracking-wider">Step 1 of 3 — Your name</p>
          <form onSubmit={handleNameNext} className="w-full max-w-xs flex flex-col gap-4">
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
              Next
            </button>
          </form>
          {error && <p className="text-coral font-bold text-center">{error}</p>}
        </div>
      )
    }

    // Step 2: Color picker
    if (step === 2) {
      const takenColors = new Set(
        Object.values(gameState?.players ?? {})
          .filter((p) => p.id !== playerId && p.color)
          .map((p) => p.color)
      )
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
          <h1 className="text-2xl font-black text-ink text-center">Pick your color</h1>
          <p className="text-sm font-bold text-muted uppercase tracking-wider">Step 2 of 3 — Choose a color</p>
          {colors.length === 0 ? (
            <p className="text-muted font-semibold">Loading colors...</p>
          ) : (
            <div className="grid grid-cols-4 gap-4 max-w-xs w-full">
              {colors.map((c) => {
                const taken = takenColors.has(c.hex)
                return (
                  <button
                    key={c.hex}
                    onClick={() => !taken && handleColorNext(c.hex)}
                    disabled={taken}
                    className="flex flex-col items-center gap-1"
                    style={{ opacity: taken ? 0.35 : 1, cursor: taken ? 'not-allowed' : 'pointer' }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        backgroundColor: taken ? '#aaaaaa' : c.hex,
                        border: selectedColor === c.hex ? '4px solid #222' : '3px solid transparent',
                        boxShadow: selectedColor === c.hex ? '0 0 0 2px #fff' : undefined,
                      }}
                    />
                    <span className="text-xs font-bold text-ink">{c.name}</span>
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={() => setStep(1)}
            className="text-sm font-bold text-muted underline"
          >
            Back
          </button>
        </div>
      )
    }

    // Step 3: Pixel editor
    if (step === 3) {
      const previewPlayer = {
        id: playerId,
        name: nameInput,
        color: selectedColor,
        avatar: avatarCells.join(''),
        role: 'player' as const,
        connected: true,
        joinedAt: '',
        totalScore: 0,
        miniGameScore: 0,
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
          <h1 className="text-2xl font-black text-ink text-center">Design your avatar</h1>
          <p className="text-sm font-bold text-muted uppercase tracking-wider">Step 3 of 3 — Pixel art</p>
          <p className="text-sm font-semibold text-muted text-center">
            Tap to cycle: color → dark → white. <span className="font-black text-ink">{paintedCount}/{MAX_PAINTED}</span> squares used.
          </p>

          {/* Preview */}
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar player={previewPlayer} size={80} />
            <span className="text-sm font-bold text-muted">Preview</span>
          </div>

          {/* 8x8 grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 36px)',
              gap: 2,
              padding: 12,
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: 8,
            }}
          >
            {avatarCells.map((cell, i) => (
              <button
                key={i}
                onClick={() => toggleCell(i)}
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor:
                    cell === 1 ? '#333333' :
                    cell === 2 ? '#ffffff' :
                    selectedColor,
                  border: '1.5px solid rgba(0,0,0,0.15)',
                  borderRadius: 2,
                }}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(2)}
              className="text-sm font-bold text-muted underline"
            >
              Back
            </button>
            <button
              onClick={handleJoinConfirm}
              className="btn-sketch bg-coral text-white text-lg px-8"
            >
              Join Game
            </button>
          </div>
          {error && <p className="text-coral font-bold text-center">{error}</p>}
        </div>
      )
    }

    return null
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
    const years = gameState.rounds.map((r) => r.wine.year).filter((y) => y > 0)
    const rawYearMin = years.length > 0 ? Math.min(...years) : new Date().getFullYear() - 10
    const rawYearMax = years.length > 0 ? Math.max(...years) : new Date().getFullYear()
    const yearMin = Math.floor((rawYearMin - 5) / 5) * 5
    const yearMax = Math.ceil((rawYearMax + 3) / 5) * 5
    const prices = gameState.rounds.map((r) => r.wine.price).filter((p) => p > 0)
    const rawMin = prices.length > 0 ? Math.min(...prices) : 10
    const rawMax = prices.length > 0 ? Math.max(...prices) : 100
    const priceMin = Math.floor((rawMin * 0.8) / 5) * 5
    const priceMax = Math.ceil((rawMax * 1.2) / 5) * 5

    function handleGuess(payload: GuessPayload) {
      sendGuess(payload)
      setSubmittedRound(gameState?.currentRound ?? null)
    }

    return (
      <div className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-ink">
            Wine #{gameState.currentRound + 1} of {gameState.rounds.length}
          </h2>
          <span className="sketch-border bg-white px-2 py-1 text-sm font-bold text-ink">
            {me.totalScore + me.miniGameScore}pt
          </span>
        </div>
        <BlindTastingForm
          onSubmit={handleGuess}
          submitted={submittedThisRound}
          yearMin={yearMin}
          yearMax={yearMax}
          priceMin={priceMin}
          priceMax={priceMax}
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

        <div className="sketch-border-sunny bg-sunny/20 px-4 py-4 mb-4">
          <p className="text-sm font-bold text-muted">The wine was...</p>
          <p className="text-xl font-black text-ink">{currentRound.wine.name}</p>
          <p className="text-lg font-bold mt-0.5 text-ink">{currentRound.wine.variety}</p>
          <p className="font-semibold text-muted">{currentRound.wine.country} · {currentRound.wine.region}, <span className="font-black text-[#722F37]">{currentRound.wine.year}</span></p>
        </div>

        {myScore && myGuess && (
          <div className="mb-4">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl font-black text-ink">+{myScore.points}</span>
              <span className="text-sm font-bold text-muted">this round</span>
            </div>
            <div className="sketch-border bg-white overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_1fr_auto] text-xs font-bold text-muted uppercase tracking-wide bg-ink/5 px-3 py-1.5 gap-2">
                <span></span>
                <span>Your guess</span>
                <span>Answer</span>
                <span>Pts</span>
              </div>
              {[
                {
                  label: 'Variety',
                  guess: myGuess.variety || '—',
                  answer: currentRound.wine.variety,
                  pts: myScore.varietyHit ? 3 : 0,
                },
                {
                  label: 'Country',
                  guess: myGuess.country || '—',
                  answer: currentRound.wine.country,
                  pts: myScore.countryPoints,
                },
                {
                  label: 'Region',
                  guess: myGuess.region || '—',
                  answer: currentRound.wine.region,
                  pts: myScore.regionHit ? 2 : 0,
                },
                {
                  label: 'Year',
                  guess: String(myGuess.year),
                  answer: String(currentRound.wine.year),
                  pts: myScore.yearPoints,
                },
                ...(currentRound.wine.price > 0 ? [{
                  label: 'Price',
                  guess: myGuess.price > 0 ? `$${myGuess.price}` : '—',
                  answer: `$${currentRound.wine.price}`,
                  pts: myScore.pricePoints,
                }] : []),
              ].map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[auto_1fr_1fr_auto] px-3 py-2 gap-2 items-center border-t border-ink/10"
                >
                  <span className="text-xs font-bold text-muted w-14">{row.label}</span>
                  <span className="text-sm font-semibold text-ink truncate">{row.guess}</span>
                  <span className="text-sm font-semibold text-muted truncate">{row.answer}</span>
                  <span className={`text-xs font-black w-8 text-right ${row.pts > 0 ? 'text-lime' : 'text-muted'}`}>
                    {row.pts > 0 ? `+${row.pts}` : '—'}
                  </span>
                </div>
              ))}
              <div className="border-t border-ink/10 px-3 py-2">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-start">
                  <span className="text-xs font-bold text-muted w-14">Flavors</span>
                  <span className="text-sm font-semibold leading-snug">
                    {myGuess.flavors.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      myGuess.flavors.map((f, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-muted">, </span>}
                          <span className={(myScore.flavorMatches ?? []).includes(f) ? 'text-lime font-bold' : 'text-muted'}>
                            {f}
                          </span>
                        </span>
                      ))
                    )}
                  </span>
                  <span className="text-sm font-semibold text-muted leading-snug">
                    {currentRound.wine.flavors?.join(', ') || '—'}
                  </span>
                  <span className={`text-xs font-black w-8 text-right ${myScore.flavorPoints > 0 ? 'text-lime' : 'text-muted'}`}>
                    {myScore.flavorPoints > 0 ? `+${myScore.flavorPoints}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        {!myScore && myGuess === undefined && (
          <div className="sketch-border bg-white px-4 py-3 mb-4">
            <p className="font-semibold text-muted">You didn't submit a guess this round.</p>
          </div>
        )}

        <p className="text-center text-muted font-semibold mt-6">Waiting for next round...</p>
      </div>
    )
  }

  // Complete phase
  if (gameState?.phase === 'complete') {
    const winner = gameState.leaderboard[0]
    const isWinner = winner?.playerId === playerId
    return (
      <div className="flex flex-col items-center min-h-screen px-6 pt-8 pb-12 gap-6 text-center max-w-sm mx-auto">
        <div className="text-6xl">{isWinner ? '🏆' : '🍷'}</div>
        <h1 className="text-3xl font-black">
          {isWinner ? 'You won!' : 'Game Over!'}
        </h1>
        {winner && (
          <div className="sketch-border-sunny bg-sunny/20 px-6 py-4 w-full">
            <p className="text-sm font-bold text-muted">Winner</p>
            <p className="text-2xl font-black">{winner.playerName}</p>
            <p className="text-lg font-bold text-grape">{winner.combinedScore} points</p>
          </div>
        )}
        {me && (me.totalScore > 0 || me.miniGameScore > 0) && (
          <div className="sketch-border bg-white px-4 py-4 w-full text-left">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Score Breakdown</p>
            <div className="space-y-1.5 text-sm font-semibold">
              <p>Wine tasting: <span className="font-black">{me.totalScore} pts</span></p>
              <p>Mini-games: <span className="font-black">{me.miniGameScore} pts</span></p>
              <p className="border-t border-ink/10 pt-1">Combined: <span className="text-grape font-black">{me.totalScore + me.miniGameScore} pts</span></p>
            </div>
          </div>
        )}
        {gameState.rounds.length > 0 && (
          <div className="sketch-border bg-white px-4 py-4 w-full text-left">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Wine Ratings</p>
            {gameState.rounds.map((round, i) => {
              const guess = round.guesses.find((g) => g.playerId === playerId)
              const score = round.scores.find((s) => s.playerId === playerId)
              return (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-paper">
                  <span className="font-semibold text-ink truncate">{round.wine.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-muted">{guess ? `${guess.rating}/10` : '—'}</span>
                    <span className="font-black text-grape">+{score?.points ?? 0}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {(gameState.miniGameResults?.length ?? 0) > 0 && (
          <div className="sketch-border bg-white px-4 py-4 w-full text-left">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Mini-Games</p>
            {gameState.miniGameResults!.map((r, i) => {
              const delta = r.playerDelta[playerId] ?? 0
              return (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-paper">
                  <span className="font-semibold text-ink capitalize">{r.gameType.replace(/_/g, ' ')}</span>
                  <span className="font-black text-grape">+{delta}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Mini-game phase
  if (gameState?.phase === 'minigame' && gameState.miniGame) {
    const mg = gameState.miniGame
    const type = mg.config.type
    return (
      <div className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-ink capitalize">Mini Game: {type}</h2>
          <span className="sketch-border bg-white px-2 py-1 text-sm font-bold text-ink">
            {me.totalScore + me.miniGameScore}pt
          </span>
        </div>
        {type === 'trivia' && (
          <TriviaGame
            config={mg.config}
            myState={mg.triviaStates?.[playerId]}
            currentQuestion={mg.currentQuestion}
            answerRevealed={mg.answerRevealed ?? false}
            onAnswer={(i) => sendMiniGameAnswer({ triviaAnswerIndex: i })}
          />
        )}
        {type === 'wordle' && (
          <WordleGame
            config={mg.config}
            myState={mg.wordleStates?.[playerId]}
            onGuess={(word) => sendMiniGameAnswer({ wordleGuess: word })}
          />
        )}
        {type === 'connections' && (
          <ConnectionsGame
            config={mg.config}
            myState={mg.connStates?.[playerId]}
            onSubmitGroup={(words) => sendMiniGameAnswer({ connGroup: words })}
          />
        )}
        {type === 'fibbage' && (
          <FibbageGame
            config={mg.config}
            myState={mg.fibbageStates?.[playerId]}
            slots={mg.fibbageSlots ?? []}
            subPhase={mg.subPhase ?? 'submitting'}
            currentQuestion={mg.currentQuestion}
            players={gameState.players}
            onSubmit={(text) => sendMiniGameAnswer({ fibbageSubmission: text })}
            onVote={(slotId) => sendMiniGameAnswer({ fibbageVoteSlot: slotId })}
          />
        )}
        {type === 'quiplash' && (
          <QuiplashGame
            config={mg.config}
            myState={mg.quiplashStates?.[playerId]}
            matchup={mg.quiplashMatchups?.[mg.currentQuestion]}
            slots={mg.quiplashSlots ?? []}
            subPhase={mg.subPhase ?? 'submitting'}
            currentRound={mg.currentQuestion}
            playerId={playerId}
            players={gameState.players}
            onSubmit={(text) => sendMiniGameAnswer({ quiplashSubmission: text })}
            onVote={(slotId) => sendMiniGameAnswer({ quiplashVoteSlot: slotId })}
          />
        )}
        {type === 'emoji_decode' && (
          <EmojiDecodeGame
            config={mg.config}
            currentRound={mg.currentQuestion}
            subPhase={mg.subPhase ?? 'active'}
            correctAnswerers={mg.emojiCorrectAnswerers ?? []}
            roundStartedAt={mg.roundStartedAt}
            playerId={playerId}
            onAnswer={(text) => sendMiniGameAnswer({ emojiAnswer: text })}
          />
        )}
        {error && <p className="text-coral font-bold mt-4 text-center">{error}</p>}
      </div>
    )
  }

  // Mini-game results phase
  if (gameState?.phase === 'minigame_results' && gameState.miniGame) {
    const mg = gameState.miniGame
    const type = mg.config.type
    return (
      <div className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-md mx-auto">
        <h2 className="text-2xl font-black mb-4 text-center">Mini-Game Results</h2>
        {type === 'trivia' && (() => {
          const questions = mg.config.questions ?? []
          const myTriviaState = mg.triviaStates?.[playerId]
          return (
            <div className="flex flex-col gap-4">
              {questions.map((q, qi) => {
                const myAnswer = myTriviaState?.answers?.[qi] ?? -1
                const answered = myAnswer !== -1
                const correct = answered && q.options[myAnswer]?.toLowerCase().trim() === q.answer.toLowerCase().trim()
                return (
                  <div key={qi} className="sketch-border bg-white px-4 py-3">
                    <p className="font-black text-sm text-ink mb-2">Q{qi + 1}: {q.text}</p>
                    {answered ? (
                      <p className={`text-sm font-semibold ${correct ? 'text-lime' : 'text-coral'}`}>
                        {correct ? '✓' : '✗'} You answered: {q.options[myAnswer]}
                      </p>
                    ) : (
                      <p className="text-sm text-muted font-semibold">No answer</p>
                    )}
                    <p className="text-xs text-muted mt-1">Correct: <span className="font-bold text-ink">{q.answer}</span></p>
                  </div>
                )
              })}
              <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center">
                <p className="font-bold text-sm text-muted">Your mini-game score</p>
                <p className="text-3xl font-black text-grape">{myTriviaState?.points ?? 0} pts</p>
              </div>
            </div>
          )
        })()}
        {type === 'wordle' && (() => {
          const myWordleState = mg.wordleStates?.[playerId]
          const word = mg.config.word ?? ''
          return (
            <div className="flex flex-col gap-4 items-center">
              <div className="sketch-border-grape bg-grape/10 px-6 py-4 text-center w-full">
                <p className="font-bold text-sm text-muted">The word was</p>
                <p className="text-4xl font-black text-grape uppercase tracking-widest">{word}</p>
              </div>
              {myWordleState ? (
                <>
                  <div className="flex flex-col gap-1">
                    {myWordleState.guesses.map((g, i) => (
                      <div key={i} className="flex gap-1">
                        {g.states.map((s, j) => (
                          <div
                            key={j}
                            className={`w-12 h-12 border-2 flex items-center justify-center font-black text-lg uppercase ${
                              s === 'correct' ? 'bg-lime border-lime text-ink' :
                              s === 'present' ? 'bg-sunny border-sunny text-ink' :
                              'bg-muted/30 border-muted/30 text-ink'
                            }`}
                          >
                            {g.word[j]}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center w-full">
                    <p className="font-bold text-sm text-muted">Your mini-game score</p>
                    <p className="text-3xl font-black text-grape">{myWordleState.points} pts</p>
                  </div>
                </>
              ) : (
                <p className="text-muted font-semibold">You didn't play.</p>
              )}
            </div>
          )
        })()}
        {type === 'connections' && (() => {
          const myConnState = mg.connStates?.[playerId]
          const groups = mg.config.groups ?? []
          return (
            <div className="flex flex-col gap-3">
              {groups.map((g) => {
                const found = myConnState?.foundGroups.includes(g.category)
                return (
                  <div
                    key={g.category}
                    className={`px-4 py-2 border-2 text-center ${
                      g.color === 'yellow' ? 'bg-sunny/30 border-sunny' :
                      g.color === 'green' ? 'bg-lime/30 border-lime' :
                      g.color === 'blue' ? 'bg-sky/30 border-sky' :
                      'bg-[#E9D5FF] border-[#A855F7]'
                    } ${!found ? 'opacity-50' : ''}`}
                  >
                    <p className="font-black text-sm uppercase tracking-wide">{g.category} {found ? '✓' : ''}</p>
                    <p className="text-xs font-semibold">{g.words.join(', ')}</p>
                  </div>
                )
              })}
              <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center">
                <p className="font-bold text-sm text-muted">Your mini-game score</p>
                <p className="text-3xl font-black text-grape">{myConnState?.points ?? 0} pts</p>
              </div>
            </div>
          )
        })()}
        {type === 'fibbage' && (() => {
          const myFibbageState = mg.fibbageStates?.[playerId]
          const questions = mg.config.fibbageQuestions ?? []
          return (
            <div className="flex flex-col gap-3">
              {questions.map((q, qi) => (
                <div key={qi} className="sketch-border bg-white px-4 py-3">
                  <p className="font-black text-sm text-ink mb-1">Q{qi + 1}: {q.prompt}</p>
                  <p className="text-xs text-muted">Answer: <span className="font-bold text-ink">{q.answer}</span></p>
                </div>
              ))}
              <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center">
                <p className="font-bold text-sm text-muted">Your mini-game score</p>
                <p className="text-3xl font-black text-grape">{myFibbageState?.points ?? 0} pts</p>
              </div>
            </div>
          )
        })()}
        {type === 'quiplash' && (() => {
          const myQuiplashState = mg.quiplashStates?.[playerId]
          return (
            <div className="flex flex-col gap-3">
              <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center">
                <p className="font-bold text-sm text-muted">Your mini-game score</p>
                <p className="text-3xl font-black text-grape">{myQuiplashState?.points ?? 0} pts</p>
              </div>
            </div>
          )
        })()}
        {type === 'emoji_decode' && (() => {
          const myEmojiState = mg.emojiStates?.[playerId]
          const rounds = mg.config.emojiRounds ?? []
          return (
            <div className="flex flex-col gap-3">
              {rounds.map((r, ri) => {
                const won = myEmojiState?.roundWins?.[ri] ?? false
                return (
                  <div key={ri} className={`sketch-border px-4 py-2 ${won ? 'bg-lime/20' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{r.emoji}</span>
                      <span className="font-semibold text-sm text-ink">{r.answer}</span>
                      {won && <span className="text-xs font-black text-lime-700">Won!</span>}
                    </div>
                  </div>
                )
              })}
              <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center">
                <p className="font-bold text-sm text-muted">Your mini-game score</p>
                <p className="text-3xl font-black text-grape">{myEmojiState?.points ?? 0} pts</p>
              </div>
            </div>
          )
        })()}
        <p className="text-center text-muted font-semibold mt-6">Waiting for host to continue...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-6xl">🍷</div>
      <h1 className="text-2xl font-black text-ink">Wine Party</h1>
      <p className="font-semibold text-muted">
        Waiting for host<span className="animate-pulse">...</span>
      </p>
    </div>
  )
}
