import { useState, useEffect, useRef } from 'react'
import type { MiniGameConfig } from '../../types/game'

interface Props {
  config: MiniGameConfig
  currentRound: number
  subPhase: string
  correctAnswerers: string[]
  roundStartedAt: string | undefined
  playerId: string
  onAnswer: (text: string) => void
}

export function EmojiDecodeGame({
  config,
  currentRound,
  subPhase,
  correctAnswerers,
  roundStartedAt,
  playerId,
  onAnswer,
}: Props) {
  const [input, setInput] = useState('')
  const [incorrect, setIncorrect] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const timerSecs = config.timerSeconds ?? 30
  const rounds = config.emojiRounds ?? []
  const round = rounds[currentRound]

  useEffect(() => {
    setInput('')
    setIncorrect(false)
    if (!roundStartedAt || subPhase !== 'active') {
      setSecondsLeft(null)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    const startTime = new Date(roundStartedAt).getTime()
    function tick() {
      const elapsed = (Date.now() - startTime) / 1000
      const left = Math.max(0, timerSecs - elapsed)
      setSecondsLeft(Math.ceil(left))
    }
    tick()
    intervalRef.current = setInterval(tick, 250)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentRound, roundStartedAt, subPhase, timerSecs])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    onAnswer(input.trim())
    setInput('')
    setIncorrect(true)
  }

  if (!round) return null

  const alreadyCorrect = correctAnswerers.includes(playerId)

  if (subPhase === 'active') {
    const timerPct = secondsLeft !== null ? (secondsLeft / timerSecs) * 100 : 100
    const timerColor = timerPct > 50 ? 'bg-lime' : timerPct > 25 ? 'bg-sunny' : 'bg-coral'
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border bg-white px-4 py-6 text-center">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
            Round {currentRound + 1} of {rounds.length} — What does this represent?
          </p>
          <p className="text-5xl leading-relaxed">{round.emoji}</p>
        </div>
        <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${timerColor} transition-all duration-250`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        {secondsLeft !== null && (
          <p className="text-center font-black text-2xl text-ink">{secondsLeft}s</p>
        )}
        {alreadyCorrect ? (
          <div className="sketch-border-lime bg-lime/20 px-6 py-4 text-center w-full">
            <p className="font-black text-xl text-ink">Got it! Waiting for round to end...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Type your answer..."
              value={input}
              onChange={(e) => { setInput(e.target.value); setIncorrect(false) }}
              className="sketch-border px-4 py-3 font-semibold bg-white w-full"
              maxLength={60}
              autoFocus
            />
            {incorrect && (
              <p className="text-coral font-bold text-sm text-center">Incorrect, try again</p>
            )}
            <button type="submit" className="btn-sketch bg-grape text-white w-full font-bold">
              Submit
            </button>
          </form>
        )}
      </div>
    )
  }

  if (subPhase === 'round_expired') {
    return (
      <div className="flex flex-col gap-4 items-center text-center">
        <div className="sketch-border bg-white px-4 py-4 w-full">
          <p className="text-4xl">{round.emoji}</p>
        </div>
        <div className="sketch-border-coral bg-coral/20 px-6 py-4 w-full">
          <p className="text-sm font-bold text-muted">Time's up! The answer was</p>
          <p className="text-2xl font-black text-ink">{round.answer}</p>
        </div>
        <p className="text-muted font-semibold">
          {alreadyCorrect ? 'You got it! Waiting for host...' : 'Waiting for host...'}
        </p>
      </div>
    )
  }

  return null
}
