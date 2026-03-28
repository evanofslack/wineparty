import { useState } from 'react'
import type { MiniGameConfig, PlayerQuiplashState, QuiplashMatchup, QuiplashSlot, Player } from '../../types/game'

interface Props {
  config: MiniGameConfig
  myState: PlayerQuiplashState | undefined
  matchup: QuiplashMatchup | undefined
  slots: QuiplashSlot[]
  subPhase: string
  currentRound: number
  playerId: string
  players: Record<string, Player>
  onSubmit: (text: string) => void
  onVote: (slotId: number) => void
}

export function QuiplashGame({
  config,
  myState,
  matchup,
  slots,
  subPhase,
  currentRound,
  playerId,
  players,
  onSubmit,
  onVote,
}: Props) {
  const [input, setInput] = useState('')

  const totalRounds = config.prompts?.length ?? 0
  const isMatched = matchup ? (playerId === matchup.playerA || playerId === matchup.playerB) : false

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    onSubmit(input.trim())
    setInput('')
  }

  if (!matchup) {
    return (
      <div className="sketch-border bg-white px-4 py-6 text-center">
        <p className="font-bold text-muted">Waiting for round to start...</p>
      </div>
    )
  }

  const playerAName = players[matchup.playerA]?.name ?? matchup.playerA
  const playerBName = players[matchup.playerB]?.name ?? matchup.playerB

  if (subPhase === 'submitting') {
    if (!isMatched) {
      return (
        <div className="flex flex-col gap-4">
          <div className="sketch-border-sky bg-sky/10 px-4 py-4 text-center">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
              Round {currentRound + 1} of {totalRounds}
            </p>
            <p className="font-black text-lg text-ink">{playerAName} vs {playerBName}</p>
          </div>
          <div className="sketch-border bg-white px-4 py-6 text-center">
            <p className="font-bold text-muted">Waiting for players to respond...</p>
          </div>
        </div>
      )
    }

    const hasSubmitted = myState?.submissions?.[currentRound] !== undefined
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border-sky bg-sky/10 px-4 py-4 text-center">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
            Round {currentRound + 1} of {totalRounds} — Head to Head
          </p>
          <p className="text-xl font-black text-ink">{matchup.prompt}</p>
        </div>
        {hasSubmitted ? (
          <div className="sketch-border-lime bg-lime/10 px-4 py-3 text-center">
            <p className="font-bold text-muted">Answer submitted. Waiting for opponent...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your answer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="sketch-border px-4 py-3 font-semibold bg-white w-full"
              maxLength={100}
              autoFocus
            />
            <button type="submit" className="btn-sketch bg-coral text-white w-full font-bold">
              Submit Answer
            </button>
          </form>
        )}
      </div>
    )
  }

  if (subPhase === 'voting') {
    if (isMatched) {
      return (
        <div className="flex flex-col gap-4">
          <div className="sketch-border-sky bg-sky/10 px-4 py-4 text-center">
            <p className="text-xl font-black text-ink">{matchup.prompt}</p>
          </div>
          <div className="sketch-border bg-white px-4 py-6 text-center">
            <p className="font-bold text-muted">Waiting for votes...</p>
          </div>
        </div>
      )
    }

    const hasVoted = myState?.votes?.[currentRound] !== undefined
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border-sky bg-sky/10 px-4 py-4 text-center">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Vote for your favorite</p>
          <p className="text-xl font-black text-ink">{matchup.prompt}</p>
        </div>
        {hasVoted ? (
          <div className="sketch-border-lime bg-lime/10 px-4 py-3 text-center">
            <p className="font-bold text-muted">Vote cast. Waiting for results...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => onVote(slot.id)}
                className="sketch-border bg-white px-4 py-4 text-left font-semibold w-full text-lg"
              >
                {slot.text}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (subPhase === 'revealing') {
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border-sky bg-sky/10 px-4 py-4 text-center">
          <p className="text-xl font-black text-ink">{matchup.prompt}</p>
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((slot) => {
            const owner = slot.playerId ? players[slot.playerId] : null
            const isMe = slot.playerId === playerId
            return (
              <div
                key={slot.id}
                className={`sketch-border px-4 py-3 ${isMe ? 'bg-sunny/20' : 'bg-white'}`}
              >
                <p className="font-semibold text-ink text-lg">{slot.text}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted">{owner?.name ?? '?'}{isMe ? ' (you)' : ''}</p>
                  <p className="text-sm font-black text-grape">{slot.votes ?? 0} vote{(slot.votes ?? 0) !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-center text-muted font-semibold text-sm">Waiting for host...</p>
      </div>
    )
  }

  return null
}
