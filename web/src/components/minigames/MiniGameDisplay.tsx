import { useMemo, useState, useEffect } from 'react'
import type { MiniGameState, Player, EmojiRound } from '../../types/game'

interface Props {
  miniGame: MiniGameState
  players: Record<string, Player>
  resultsMode?: boolean
}

const COLOR_STYLES: Record<string, string> = {
  yellow: 'bg-sunny/30 border-sunny',
  green: 'bg-lime/30 border-lime',
  blue: 'bg-sky/30 border-sky',
  purple: 'bg-grape/20 border-grape',
}

interface EmojiLiveProps {
  round: EmojiRound | undefined
  subPhase: string
  timerSecs: number
  roundStartedAt: string | undefined
  currentQuestion: number
  totalRounds: number
  emojiCorrectAnswerers: string[]
  players: Record<string, Player>
}

function EmojiLiveDisplay({
  round, subPhase, timerSecs, roundStartedAt, currentQuestion, totalRounds, emojiCorrectAnswerers, players
}: EmojiLiveProps) {
  const [remaining, setRemaining] = useState<number>(timerSecs)

  useEffect(() => {
    if (subPhase !== 'active' || !roundStartedAt) {
      setRemaining(timerSecs)
      return
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(roundStartedAt).getTime()) / 1000
      setRemaining(Math.max(0, timerSecs - elapsed))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [subPhase, roundStartedAt, timerSecs])

  const pct = timerSecs > 0 ? remaining / timerSecs : 0
  const barColor = pct > 0.5 ? 'bg-lime' : pct > 0.25 ? 'bg-sunny' : 'bg-coral'

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <p className="text-3xl font-black text-ink uppercase tracking-widest">Emoji Decode</p>
      <p className="text-sm font-bold text-muted uppercase tracking-wider">
        Round {currentQuestion + 1} of {totalRounds}
      </p>
      {round && (
        <div className="sketch-border-sky bg-sky/10 px-10 py-12 text-center w-full">
          <p className="text-9xl leading-relaxed">{round.emoji}</p>
        </div>
      )}
      {subPhase === 'active' && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="w-full bg-paper border-2 border-muted/20 h-4">
            <div
              className={`h-full transition-all ${barColor}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <p className="font-black text-2xl tabular-nums">{Math.ceil(remaining)}s</p>
          {emojiCorrectAnswerers.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {emojiCorrectAnswerers.map((id) => (
                <span key={id} className="text-sm font-black px-2 py-0.5 bg-lime text-ink">
                  {players[id]?.name ?? id} ✓
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {subPhase === 'round_won' && round && (
        <div className="sketch-border-lime bg-lime/20 px-6 py-3 text-center w-full">
          <p className="font-black text-2xl text-lime-700">{round.answer}</p>
          {emojiCorrectAnswerers.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {emojiCorrectAnswerers.map((id) => (
                <span key={id} className="text-sm font-black px-2 py-0.5 bg-lime text-ink">
                  {players[id]?.name ?? id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {subPhase === 'round_expired' && (
        <div className="sketch-border-coral bg-coral/20 px-6 py-3 text-center w-full">
          <p className="font-black text-3xl text-coral">Time's up!</p>
          {round && <p className="text-2xl font-black text-ink">{round.answer}</p>}
          {emojiCorrectAnswerers.length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {emojiCorrectAnswerers.map((id) => (
                <span key={id} className="text-sm font-black px-2 py-0.5 bg-lime text-ink">
                  {players[id]?.name ?? id}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-bold text-muted mt-1">No one got it</p>
          )}
        </div>
      )}
    </div>
  )
}

export function MiniGameDisplay({ miniGame, players, resultsMode = false }: Props) {
  const playerList = Object.values(players).filter((p) => p.role === 'player')
  const { config } = miniGame

  if (config.type === 'trivia') {
    const questions = config.questions ?? []
    const q = questions[miniGame.currentQuestion]
    const totalAnswered = q
      ? Object.values(miniGame.triviaStates ?? {}).filter(
          (s) => s.answers[miniGame.currentQuestion] !== undefined && s.answers[miniGame.currentQuestion] !== -1
        ).length
      : 0

    if (resultsMode) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-2xl font-black text-center">Trivia Summary</p>
          {questions.map((qq, qi) => (
            <div key={qi} className="sketch-border bg-white px-5 py-4">
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">
                Q{qi + 1} · {qq.points} pts
              </p>
              <p className="font-black text-ink text-lg mb-1">{qq.text}</p>
              <p className="text-sm font-semibold text-lime-700 mb-2">✓ {qq.answer}</p>
              <div className="flex flex-wrap gap-1">
                {playerList.map((p) => {
                  const ps = miniGame.triviaStates?.[p.id]
                  const idx = ps?.answers?.[qi] ?? -1
                  const answered = idx !== -1
                  const correct = answered && qq.options[idx]?.toLowerCase().trim() === qq.answer.toLowerCase().trim()
                  return (
                    <span
                      key={p.id}
                      className={`text-sm font-bold px-2 py-0.5 ${correct ? 'bg-lime text-ink' : answered ? 'bg-coral text-white' : 'bg-paper text-muted'}`}
                    >
                      {p.name}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="sketch-border-sky bg-sky/10 px-8 py-10 text-center">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">
            Question {miniGame.currentQuestion + 1} of {questions.length}
          </p>
          {q ? (
            <>
              <p className="text-4xl font-black text-ink mb-4">{q.text}</p>
              <div className="grid grid-cols-2 gap-4">
                {q.options.map((opt, i) => {
                  const isCorrect = opt.toLowerCase().trim() === q.answer.toLowerCase().trim()
                  const highlight = miniGame.answerRevealed && isCorrect
                  return (
                    <div
                      key={i}
                      className={`sketch-border px-4 py-3 text-left font-semibold text-xl ${highlight ? 'bg-lime' : 'bg-white'}`}
                    >
                      <span className="font-black text-grape mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-xl font-black text-muted">All questions answered!</p>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-xl text-muted">
            <span className="text-grape font-black">{totalAnswered}</span> / {playerList.length} answered
          </p>
        </div>
        {miniGame.answerRevealed && q && (
          <div className="flex flex-col gap-1 mt-2">
            {playerList.map((p) => {
              const ps = miniGame.triviaStates?.[p.id]
              const idx = ps?.answers?.[miniGame.currentQuestion] ?? -1
              const answered = idx !== -1
              const correct = answered && q.options[idx]?.toLowerCase().trim() === q.answer.toLowerCase().trim()
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1 text-base font-semibold ${
                    correct ? 'bg-lime/30' : answered ? 'bg-coral/20' : 'bg-paper'
                  }`}
                >
                  <span className="font-black">{correct ? '✓' : answered ? '✗' : '—'}</span>
                  <span>{p.name}</span>
                  {answered && !correct && (
                    <span className="text-sm text-muted ml-auto">{q.options[idx]}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (config.type === 'wordle') {
    const word = config.word ?? ''
    const wordLen = word.length
    const maxGuesses = config.maxGuesses ?? 6
    const solved = Object.values(miniGame.wordleStates ?? {}).filter((s) => s.solved).length

    return (
      <div className="flex flex-col items-center gap-10">
        <p className="text-3xl font-black text-ink uppercase tracking-widest">Wordle</p>
        {resultsMode && (
          <p className="text-5xl font-black text-grape uppercase tracking-widest">{word}</p>
        )}
        <div className="flex gap-1">
          {Array.from({ length: wordLen }, (_, i) => (
            <div key={i} className="w-24 h-24 border-4 border-muted/30 bg-white" />
          ))}
        </div>
        <p className="text-2xl font-bold text-muted">
          {wordLen}-letter word · {maxGuesses} guesses
        </p>
        <p className="font-bold text-2xl">
          <span className="text-lime font-black">{solved}</span> / {playerList.length} solved
        </p>
      </div>
    )
  }

  if (config.type === 'connections') {
    const groups = config.groups ?? []
    const connStates = miniGame.connStates ?? {}

    if (resultsMode) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-2xl font-black text-center text-ink">Connections — Results</p>
          {groups.map((g) => {
            const count = Object.values(connStates).filter((s) => s.foundGroups.includes(g.category)).length
            return (
              <div
                key={g.category}
                className={`px-5 py-4 border-2 ${COLOR_STYLES[g.color] ?? COLOR_STYLES.yellow} text-center`}
              >
                <p className="font-black text-base uppercase tracking-wide">{g.category}</p>
                <p className="text-sm font-semibold">{g.words.join(', ')}</p>
                <p className="text-sm text-muted mt-1">{count} player{count !== 1 ? 's' : ''} found this</p>
              </div>
            )
          })}
        </div>
      )
    }

    const allWords = useMemo(() => {
      const words = groups.flatMap((g) => g.words)
      const seed = words.slice().sort().join('')
      let h = 0
      for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
      const arr = [...words]
      for (let i = arr.length - 1; i > 0; i--) {
        h = (Math.imul(h ^ (h >>> 13), 0x9e3779b9) | 0) >>> 0
        const j = h % (i + 1)
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }, [groups])
    const totalFound = Object.values(connStates).reduce((sum, s) => sum + s.foundGroups.length, 0)

    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-2xl font-black text-center text-ink">Connections</p>
        <p className="text-center font-bold text-lg text-muted">
          <span className="text-grape font-black">{totalFound}</span> groups found so far
        </p>
        {/* All 16 words (non-interactive, no category names) */}
        <div className="grid grid-cols-4 gap-2">
          {allWords.map((word) => (
            <div
              key={word}
              className="px-3 py-5 border-2 border-muted/30 bg-white font-bold text-xl text-center text-ink"
            >
              {word}
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="font-bold text-muted">
            {Object.values(connStates).length} players participating
          </p>
        </div>
      </div>
    )
  }

  if (config.type === 'fibbage') {
    const questions = config.fibbageQuestions ?? []
    const q = questions[miniGame.currentQuestion]
    const subPhase = miniGame.subPhase ?? 'submitting'
    const slots = miniGame.fibbageSlots ?? []
    const submittedCount = Object.values(miniGame.fibbageStates ?? {}).filter((s) => s.submission !== '').length
    const totalPlayers = Object.keys(miniGame.fibbageStates ?? {}).length
    const votedCount = Object.values(miniGame.fibbageStates ?? {}).filter((s) => s.votedFor !== -1).length

    if (resultsMode) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-2xl font-black text-center">Fibbage Summary</p>
          {questions.map((qq, qi) => (
            <div key={qi} className="sketch-border bg-white px-5 py-4">
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Q{qi + 1}</p>
              <p className="font-black text-ink mb-1">{qq.prompt}</p>
              <p className="text-sm font-semibold text-lime-700">✓ {qq.answer}</p>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="sketch-border-sky bg-sky/10 px-8 py-10 text-center">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">
            Question {miniGame.currentQuestion + 1} of {questions.length}
          </p>
          {q && <p className="text-4xl font-black text-ink">{q.prompt}</p>}
        </div>
        {subPhase === 'submitting' && (
          <p className="text-center font-bold text-xl text-muted">
            <span className="text-grape font-black">{submittedCount}</span> / {totalPlayers} submitted
          </p>
        )}
        {subPhase === 'voting' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <div key={slot.id} className="sketch-border bg-white px-3 py-2 flex items-center gap-3">
                  <span className="font-black text-grape w-6 shrink-0">{slot.id + 1}.</span>
                  <span className="font-semibold text-lg text-ink">{slot.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center font-bold text-muted">
              <span className="text-grape font-black">{votedCount}</span> / {totalPlayers} voted
            </p>
          </>
        )}
        {subPhase === 'revealing' && q && (() => {
          const slotVoteCounts: Record<number, number> = {}
          for (const ps of Object.values(miniGame.fibbageStates ?? {})) {
            if (ps.votedFor !== -1) {
              slotVoteCounts[ps.votedFor] = (slotVoteCounts[ps.votedFor] ?? 0) + 1
            }
          }
          return (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => {
                const owner = slot.playerId ? players[slot.playerId] : null
                const voteCount = slotVoteCounts[slot.id] ?? 0
                return (
                  <div
                    key={slot.id}
                    className={`sketch-border px-3 py-2 flex items-start gap-3 ${slot.isCorrect ? 'bg-lime/30 border-lime' : 'bg-white'}`}
                  >
                    <span className="font-black text-grape w-6 shrink-0">{slot.id + 1}.</span>
                    <div className="flex-1">
                      <p className="font-semibold text-base text-ink">{slot.text}</p>
                      {slot.isCorrect && <p className="text-xs font-black text-lime-700">REAL ANSWER</p>}
                      {owner && <p className="text-xs text-muted">{owner.name}</p>}
                    </div>
                    <span className="text-xs font-black text-grape shrink-0">
                      {'● '.repeat(voteCount).trim() || '○'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    )
  }

  if (config.type === 'quiplash') {
    const matchups = miniGame.quiplashMatchups ?? []
    const currentMatchup = matchups[miniGame.currentQuestion]
    const subPhase = miniGame.subPhase ?? 'submitting'
    const slots = miniGame.quiplashSlots ?? []

    if (resultsMode) {
      const results = miniGame.quiplashResults ?? []
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-2xl font-black text-center">Quiplash Summary</p>
          {results.map((r, i) => {
            const pA = players[r.playerA]
            const pB = players[r.playerB]
            const winnerIsA = r.winnerId === r.playerA
            const winnerIsB = r.winnerId === r.playerB
            const isTie = !r.winnerId
            const winningText = winnerIsA ? r.textA : winnerIsB ? r.textB : null
            const filledPrompt = winningText
              ? r.prompt.replace('___', `"${winningText}"`)
              : r.prompt
            return (
              <div key={i} className="sketch-border bg-white px-5 py-4">
                <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">
                  Round {i + 1}:{' '}
                  <span className={winnerIsA ? 'text-ink font-black' : ''}>{pA?.name ?? r.playerA}</span>
                  {' vs '}
                  <span className={winnerIsB ? 'text-ink font-black' : ''}>{pB?.name ?? r.playerB}</span>
                  {isTie && ' — tie'}
                </p>
                <p className="font-semibold text-ink text-lg mb-2">{filledPrompt}</p>
                <div className="flex flex-col gap-1">
                  <p className={`text-sm ${winnerIsA ? 'font-black text-grape' : 'text-muted'}`}>
                    {pA?.name ?? r.playerA}: "{r.textA}" — {r.votesA} vote{r.votesA !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-sm ${winnerIsB ? 'font-black text-grape' : 'text-muted'}`}>
                    {pB?.name ?? r.playerB}: "{r.textB}" — {r.votesB} vote{r.votesB !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    const playerAName = currentMatchup ? (players[currentMatchup.playerA]?.name ?? currentMatchup.playerA) : ''
    const playerBName = currentMatchup ? (players[currentMatchup.playerB]?.name ?? currentMatchup.playerB) : ''

    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="sketch-border-sky bg-sky/10 px-8 py-10 text-center">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">
            Round {miniGame.currentQuestion + 1} of {matchups.length}
          </p>
          {currentMatchup && (
            <>
              <p className="font-black text-2xl text-grape mb-3">{playerAName} vs {playerBName}</p>
              <p className="text-4xl font-black text-ink">{currentMatchup.prompt}</p>
            </>
          )}
        </div>
        {subPhase === 'submitting' && currentMatchup && (() => {
          const qStates = miniGame.quiplashStates ?? {}
          const submittedCount = [currentMatchup.playerA, currentMatchup.playerB]
            .filter((id) => qStates[id]?.submissions?.[miniGame.currentQuestion] !== undefined).length
          return (
            <p className="text-center font-bold text-xl text-muted">
              <span className="text-grape font-black">{submittedCount}</span> / 2 submitted
            </p>
          )
        })()}
        {subPhase === 'voting' && slots.length > 0 && (() => {
          const qStates = miniGame.quiplashStates ?? {}
          const matchedIds = new Set([currentMatchup?.playerA, currentMatchup?.playerB].filter(Boolean) as string[])
          const voterIds = Object.keys(qStates).filter((id) => !matchedIds.has(id))
          const votedCount = voterIds.filter(
            (id) => qStates[id]?.votes?.[miniGame.currentQuestion] !== undefined
          ).length
          return (
            <div className="flex flex-col gap-3">
              {slots.map((slot) => (
                <div key={slot.id} className="sketch-border bg-white px-6 py-5 text-xl font-semibold">
                  {slot.text}
                </div>
              ))}
              <p className="text-center font-bold text-muted">
                <span className="text-grape font-black">{votedCount}</span> / {voterIds.length} voted
              </p>
            </div>
          )
        })()}
        {subPhase === 'revealing' && slots.length > 0 && (
          <div className="flex flex-col gap-3">
            {slots.map((slot) => {
              const owner = slot.playerId ? players[slot.playerId] : null
              return (
                <div key={slot.id} className="sketch-border bg-white px-6 py-5">
                  <p className="text-xl font-semibold text-ink">{slot.text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-base text-muted">{owner?.name ?? '?'}</p>
                    <p className="font-black text-grape">{slot.votes ?? 0} vote{(slot.votes ?? 0) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (config.type === 'emoji_decode') {
    const rounds = config.emojiRounds ?? []
    const round = rounds[miniGame.currentQuestion]
    const subPhase = miniGame.subPhase ?? 'active'
    const timerSecs = config.timerSeconds ?? 30

    if (resultsMode) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-2xl font-black text-center">Emoji Decode Summary</p>
          {rounds.map((r, i) => {
            const winners = miniGame.emojiStates
              ? Object.entries(miniGame.emojiStates)
                  .filter(([, s]) => s.roundWins?.[i])
                  .map(([id]) => players[id]?.name ?? id)
              : []
            return (
              <div key={i} className="sketch-border bg-white px-4 py-3 flex items-center gap-4">
                <span className="text-4xl">{r.emoji}</span>
                <div className="flex-1">
                  <p className="font-black text-lg text-ink">{r.answer}</p>
                  <p className="text-sm text-muted">
                    {winners.length > 0 ? `Got by ${winners.join(', ')}` : 'No one got it'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <EmojiLiveDisplay
        round={round}
        subPhase={subPhase}
        timerSecs={timerSecs}
        roundStartedAt={miniGame.roundStartedAt}
        currentQuestion={miniGame.currentQuestion}
        totalRounds={rounds.length}
        emojiCorrectAnswerers={miniGame.emojiCorrectAnswerers ?? []}
        players={players}
      />
    )
  }

  return null
}
