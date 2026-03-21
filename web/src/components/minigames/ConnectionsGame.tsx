import { useState, useEffect, useRef } from 'react'
import type { MiniGameConfig, PlayerConnectionsState } from '../../types/game'

interface Props {
  config: MiniGameConfig
  myState: PlayerConnectionsState | undefined
  onSubmitGroup: (words: string[]) => void
}

const COLOR_STYLES: Record<string, string> = {
  yellow: 'bg-sunny/30 border-sunny text-ink',
  green: 'bg-lime/30 border-lime text-ink',
  blue: 'bg-sky/30 border-sky text-ink',
  purple: 'bg-grape/20 border-grape text-ink',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ConnectionsGame({ config, myState, onSubmitGroup }: Props) {
  const groups = config.groups ?? []
  const foundGroups = myState?.foundGroups ?? []
  const incorrectGuesses = myState?.incorrectGuesses ?? 0
  const totalGuesses = myState?.totalGuesses ?? 0
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [wordOrder, setWordOrder] = useState<string[]>(() => shuffle(groups.flatMap((g) => g.words)))
  const [shakingWords, setShakingWords] = useState<string[]>([])
  const lastSubmitted = useRef<string[]>([])
  const prevIncorrect = useRef(incorrectGuesses)

  const foundWords = new Set(
    groups
      .filter((g) => foundGroups.includes(g.category))
      .flatMap((g) => g.words)
  )

  // Remove newly found words from order
  useEffect(() => {
    setWordOrder((prev) => prev.filter((w) => !foundWords.has(w)))
  }, [foundGroups.join(',')])

  // Shake on wrong guess
  useEffect(() => {
    if (incorrectGuesses > prevIncorrect.current) {
      const words = lastSubmitted.current
      setShakingWords(words)
      const t = setTimeout(() => setShakingWords([]), 400)
      prevIncorrect.current = incorrectGuesses
      return () => clearTimeout(t)
    }
    prevIncorrect.current = incorrectGuesses
    return undefined
  }, [incorrectGuesses])

  const exhausted = totalGuesses >= 5
  const remaining = wordOrder.filter((w) => !foundWords.has(w))

  function toggleWord(word: string) {
    if (exhausted) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(word)) {
        next.delete(word)
      } else if (next.size < 4) {
        next.add(word)
      }
      return next
    })
  }

  function handleSubmit() {
    if (selected.size !== 4 || exhausted) return
    const words = Array.from(selected)
    lastSubmitted.current = words
    onSubmitGroup(words)
    setSelected(new Set())
  }

  function handleShuffle() {
    setWordOrder((prev) => shuffle(prev))
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      {/* Found groups */}
      {foundGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          {groups
            .filter((g) => foundGroups.includes(g.category))
            .map((g) => (
              <div
                key={g.category}
                className={`px-4 py-2 border-2 ${COLOR_STYLES[g.color] ?? COLOR_STYLES.yellow} text-center`}
              >
                <p className="font-black text-sm uppercase tracking-wide">{g.category}</p>
                <p className="text-xs font-semibold">{g.words.join(', ')}</p>
              </div>
            ))}
        </div>
      )}

      {/* Remaining words */}
      {remaining.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {remaining.map((word) => {
            const isSelected = selected.has(word)
            const isShaking = shakingWords.includes(word)
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                disabled={exhausted}
                className={`px-2 py-3 font-bold text-sm text-center border-2 ${isShaking ? 'animate-shake' : ''} ${
                  isSelected
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-white text-ink border-muted/30 hover:border-ink disabled:opacity-50'
                }`}
              >
                {word}
              </button>
            )
          })}
        </div>
      )}

      {/* Guess counter */}
      <div className="text-center">
        {exhausted ? (
          <p className="text-coral font-bold text-sm">No guesses remaining!</p>
        ) : (
          <p className="text-muted font-semibold text-sm">
            <span className="font-black text-ink">{5 - totalGuesses}</span> / 5 guesses remaining
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className="btn-sketch bg-paper text-muted border-muted/40 flex-1 font-bold text-sm"
          onClick={handleShuffle}
          disabled={exhausted}
        >
          Shuffle
        </button>
        <button
          className="btn-sketch bg-grape text-paper flex-1 font-bold disabled:opacity-40"
          disabled={selected.size !== 4 || exhausted}
          onClick={handleSubmit}
        >
          Submit ({selected.size}/4)
        </button>
      </div>

      {myState && (
        <p className="text-center font-bold text-sm text-muted">
          Score: <span className="text-grape font-black">{myState.points} pts</span>
        </p>
      )}
    </div>
  )
}
