import { useState } from 'react'
import type { MiniGameConfig, PlayerFibbageState, FibbageSlot, Player } from '../../types/game'

interface Props {
  config: MiniGameConfig
  myState: PlayerFibbageState | undefined
  slots: FibbageSlot[]
  subPhase: string
  currentQuestion: number
  players: Record<string, Player>
  onSubmit: (text: string) => void
  onVote: (slotId: number) => void
}

export function FibbageGame({
  config,
  myState,
  slots,
  subPhase,
  currentQuestion,
  players,
  onSubmit,
  onVote,
}: Props) {
  const [input, setInput] = useState('')
  const [rejected, setRejected] = useState(false)

  const questions = config.fibbageQuestions ?? []
  const q = questions[currentQuestion]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setRejected(false)
    onSubmit(input.trim())
    setInput('')
  }

  if (!q) return null

  const prompt = q.prompt

  if (subPhase === 'submitting') {
    const submitted = myState?.submission && myState.submission !== ''
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border bg-white px-4 py-4 text-center">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
            Question {currentQuestion + 1} of {questions.length}
          </p>
          <p className="text-xl font-black text-ink">{prompt}</p>
        </div>
        {submitted ? (
          <div className="sketch-border-lime bg-lime/10 px-4 py-3 text-center">
            <p className="font-bold text-muted">Answer submitted. Waiting for others...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Type a fake answer..."
              value={input}
              onChange={(e) => { setInput(e.target.value); setRejected(false) }}
              className="sketch-border px-4 py-3 font-semibold bg-white w-full"
              maxLength={80}
              autoFocus
            />
            {rejected && (
              <p className="text-coral font-bold text-sm text-center">
                That's the real answer! Enter something different.
              </p>
            )}
            <button type="submit" className="btn-sketch bg-grape text-white w-full font-bold">
              Submit Answer
            </button>
          </form>
        )}
      </div>
    )
  }

  if (subPhase === 'voting') {
    const hasVoted = myState !== undefined && myState.votedFor !== -1
    const mySubmission = myState?.submission ?? ''
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border bg-white px-4 py-4 text-center">
          <p className="text-xl font-black text-ink">{prompt}</p>
          <p className="text-sm font-bold text-muted mt-1">Vote for the real answer</p>
        </div>
        {hasVoted ? (
          <div className="sketch-border-lime bg-lime/10 px-4 py-3 text-center">
            <p className="font-bold text-muted">Vote cast. Waiting for others...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {slots.map((slot) => {
              const isOwn = mySubmission !== '' && slot.text.toLowerCase().trim() === mySubmission.toLowerCase().trim()
              return (
                <button
                  key={slot.id}
                  disabled={isOwn}
                  onClick={() => !isOwn && onVote(slot.id)}
                  className={`sketch-border px-4 py-3 text-left font-semibold w-full ${
                    isOwn ? 'opacity-40 cursor-not-allowed bg-paper' : 'bg-white'
                  }`}
                >
                  <span className="font-black text-grape mr-2">{slot.id + 1}.</span>
                  {slot.text}
                  {isOwn && <span className="text-xs text-muted ml-2">(yours)</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (subPhase === 'revealing') {
    const myPts = myState?.points ?? 0
    return (
      <div className="flex flex-col gap-4">
        <div className="sketch-border bg-white px-4 py-4 text-center">
          <p className="text-xl font-black text-ink">{prompt}</p>
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((slot) => {
            const owner = slot.playerId ? players[slot.playerId] : null
            return (
              <div
                key={slot.id}
                className={`sketch-border px-4 py-3 ${slot.isCorrect ? 'bg-lime/30 border-lime' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-ink">{slot.text}</span>
                  {slot.isCorrect && (
                    <span className="text-xs font-black text-lime-700 shrink-0">REAL ANSWER</span>
                  )}
                </div>
                {owner && (
                  <p className="text-xs text-muted mt-0.5">Written by {owner.name}</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="sketch-border-grape bg-grape/10 px-4 py-3 text-center">
          <p className="font-bold text-sm text-muted">Your score this question</p>
          <p className="text-3xl font-black text-grape">+{myPts} pts</p>
        </div>
        <p className="text-center text-muted font-semibold text-sm">Waiting for host...</p>
      </div>
    )
  }

  return null
}
