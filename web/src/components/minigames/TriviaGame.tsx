import { useState } from 'react'
import type { MiniGameConfig, PlayerTriviaState } from '../../types/game'

interface Props {
  config: MiniGameConfig
  myState: PlayerTriviaState | undefined
  currentQuestion: number
  answerRevealed: boolean
  onAnswer: (answerIndex: number) => void
}

export function TriviaGame({ config, myState, currentQuestion, answerRevealed, onAnswer }: Props) {
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null)
  const questions = config.questions ?? []
  if (questions.length === 0) return <p className="text-muted font-semibold text-center">No questions available.</p>

  const question = questions[currentQuestion]
  if (!question) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-xl font-black">All questions answered!</p>
        <p className="text-muted font-semibold">Waiting for host to end the mini-game...</p>
        {myState && <p className="text-lg font-bold text-grape">Your score: {myState.points} pts</p>}
      </div>
    )
  }

  const myAnswer = myState?.answers?.[currentQuestion] ?? -1
  const hasAnswered = myAnswer !== -1
  const correctAnswer = question.answer

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      <div className="sketch-border-sky bg-sky/10 px-4 py-3 text-center">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
          Question {currentQuestion + 1} of {questions.length}
        </p>
        <p className="text-lg font-black text-ink">{question.text}</p>
        <p className="text-xs font-semibold text-muted mt-1">{question.points} pts</p>
      </div>

      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => {
          const isSelected = myAnswer === i
          const isCorrect = opt.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
          let cls = 'btn-sketch w-full text-left font-semibold px-4 py-3 '
          if (hasAnswered && answerRevealed) {
            if (isCorrect) {
              cls += 'bg-lime text-ink'
            } else if (isSelected) {
              cls += 'bg-coral text-white'
            } else {
              cls += 'bg-paper text-muted'
            }
          } else if (hasAnswered && isSelected) {
            cls += 'bg-ink text-paper'
          } else if (pendingAnswer === i) {
            cls += 'bg-ink text-paper'
          } else {
            cls += 'bg-white text-ink'
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => { if (!hasAnswered) setPendingAnswer(i) }}
              disabled={hasAnswered}
            >
              <span className="font-black mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
            </button>
          )
        })}
      </div>

      <button
        className="btn-sketch bg-grape text-white w-full disabled:opacity-40"
        disabled={pendingAnswer === null || hasAnswered}
        onClick={() => {
          if (pendingAnswer !== null) {
            onAnswer(pendingAnswer)
            setPendingAnswer(null)
          }
        }}
      >
        Submit Answer
      </button>

      {myState && (
        <div className="text-center">
          <p className="font-bold text-sm text-muted">Total: <span className="text-grape font-black">{myState.points} pts</span></p>
        </div>
      )}
    </div>
  )
}
