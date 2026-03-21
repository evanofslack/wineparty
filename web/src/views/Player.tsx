import { useState, useEffect } from 'react'
import { BlindTastingForm } from '../components/BlindTastingForm'
import { Leaderboard } from '../components/Leaderboard'
import { TriviaGame } from '../components/minigames/TriviaGame'
import { WordleGame } from '../components/minigames/WordleGame'
import { ConnectionsGame } from '../components/minigames/ConnectionsGame'
import { useGameStore } from '../store/gameStore'
import type { GuessPayload, MiniGameAnswerPayload } from '../types/game'

interface Props {
  playerId: string
  playerName: string
  setPlayerName: (name: string) => void
  sendJoin: (payload: { playerId: string; name: string; password?: string }) => void
  sendGuess: (payload: GuessPayload) => void
  sendMiniGameAnswer: (payload: MiniGameAnswerPayload) => void
}

export function PlayerView({ playerId, playerName, setPlayerName, sendJoin, sendGuess, sendMiniGameAnswer }: Props) {
  const { store } = useGameStore()
  const { gameState, connected, error } = store
  const [nameInput, setNameInput] = useState(playerName)
  const [hasJoined, setHasJoined] = useState(false)
  const [submittedRound, setSubmittedRound] = useState<number | null>(null)

  useEffect(() => {
    setSubmittedRound(null)
  }, [gameState?.startedAt])

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
        <div className="sketch-border-sky bg-sky/15 px-6 py-4 w-full max-w-sm">
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
    return (
      <div className="flex flex-col min-h-screen px-4 pt-6 pb-10 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-ink">
            Wine #{gameState.currentRound + 1} of {gameState.rounds.length}
          </h2>
          <span className="sketch-border-sunny bg-sunny/20 px-2 py-1 text-sm font-bold text-ink">
            {me.totalScore}pt
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

        {/* The wine reveal */}
        <div className="sketch-border-burgundy px-4 py-4 mb-4" style={{ backgroundColor: 'rgba(114,47,55,0.15)' }}>
          <p className="text-sm font-bold text-muted">The wine was...</p>
          <p className="text-xl font-black text-ink">{currentRound.wine.name}</p>
          <p className="text-lg font-bold mt-0.5 text-ink">{currentRound.wine.variety}</p>
          <p className="font-semibold text-muted">{currentRound.wine.country} · {currentRound.wine.region}, {currentRound.wine.year}</p>
        </div>

        {/* My score diff */}
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
                  className={`grid grid-cols-[auto_1fr_1fr_auto] px-3 py-2 gap-2 items-center border-t border-ink/10 ${row.pts > 0 ? 'bg-lime/10' : ''}`}
                >
                  <span className="text-xs font-bold text-muted w-14">{row.label}</span>
                  <span className="text-sm font-semibold text-ink truncate">{row.guess}</span>
                  <span className="text-sm font-semibold text-muted truncate">{row.answer}</span>
                  <span className={`text-xs font-black w-8 text-right ${row.pts > 0 ? 'text-lime' : 'text-muted'}`}>
                    {row.pts > 0 ? `+${row.pts}` : '—'}
                  </span>
                </div>
              ))}
              {/* Flavors row */}
              <div className={`border-t border-ink/10 px-3 py-2 ${myScore.flavorPoints > 0 ? 'bg-lime/10' : ''}`}>
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
          <div className="sketch-border-sunny bg-sunny/30 px-4 py-3 mb-4">
            <p className="font-semibold text-muted">You didn't submit a guess this round.</p>
          </div>
        )}

        <div className="sketch-border-sky bg-sky/10 px-4 py-3">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Leaderboard</p>
          <Leaderboard entries={gameState.leaderboard} highlightId={playerId} />
        </div>

        <p className="text-center text-muted font-semibold mt-6">Waiting for next round...</p>
      </div>
    )
  }

  // Complete phase
  if (gameState?.phase === 'complete') {
    const winner = gameState.leaderboard[0]
    const isWinner = winner?.playerId === playerId
    const mySummary = gameState.playerSummaries?.[playerId]
    return (
      <div className="flex flex-col items-center min-h-screen px-6 pt-8 pb-12 gap-6 text-center max-w-sm mx-auto">
        <div className="text-6xl">{isWinner ? '🏆' : '🍷'}</div>
        <h1 className="text-3xl font-black">
          {isWinner ? 'You won!' : 'Game Over!'}
        </h1>
        {winner && (
          <div className="sketch-border-lime bg-lime/20 px-6 py-4 w-full">
            <p className="text-sm font-bold text-muted">Winner</p>
            <p className="text-2xl font-black">{winner.playerName}</p>
            <p className="text-lg font-bold text-grape">{winner.score} points</p>
          </div>
        )}
        <div className="w-full">
          <Leaderboard entries={gameState.leaderboard} highlightId={playerId} />
        </div>
        {me && (me.totalScore > 0 || me.miniGameScore > 0) && (
          <div className="sketch-border-sunny bg-sunny/10 px-4 py-4 w-full text-left">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Score Breakdown</p>
            <div className="space-y-1.5 text-sm font-semibold">
              <p>Wine tasting: <span className="font-black">{me.totalScore} pts</span></p>
              <p>Mini-games: <span className="font-black">{me.miniGameScore} pts</span></p>
              <p className="border-t border-sunny/40 pt-1">Combined: <span className="text-grape font-black">{me.totalScore + me.miniGameScore} pts</span></p>
            </div>
          </div>
        )}
        {mySummary && (
          <div className="sketch-border-sky bg-sky/10 px-4 py-4 w-full text-left">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Your Stats</p>
            <div className="space-y-1.5 text-sm font-semibold">
              {mySummary.favoriteWine && (
                <p>Favorite wine: <span className="text-grape font-black">{mySummary.favoriteWine} ({mySummary.favoriteWineVariety}) #{mySummary.favoriteWineRound + 1}</span></p>
              )}
              <p>Best round: <span className="font-black">Round {mySummary.bestRound + 1}</span> <span className="text-grape">(+{mySummary.bestRoundPoints}pts)</span></p>
              <p>Variety correct: <span className="font-black">{mySummary.varietyHits}</span> time{mySummary.varietyHits !== 1 ? 's' : ''}</p>
              <p>Year points total: <span className="font-black">{mySummary.totalYearPoints}</span></p>
              {mySummary.avgRatingGiven > 0 && (
                <p>Avg rating given: <span className="font-black">{mySummary.avgRatingGiven.toFixed(1)}</span>/10</p>
              )}
            </div>
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
          <span className="sketch-border-sunny bg-sunny/20 px-2 py-1 text-sm font-bold text-ink">
            {me.miniGameScore}pt
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
                      'bg-grape/20 border-grape'
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
        <p className="text-center text-muted font-semibold mt-6">Waiting for host to continue...</p>
      </div>
    )
  }

  return null
}
