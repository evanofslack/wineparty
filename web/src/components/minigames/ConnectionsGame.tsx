import { useState } from 'react'
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

export function ConnectionsGame({ config, myState, onSubmitGroup }: Props) {
  const groups = config.groups ?? []
  const foundGroups = myState?.foundGroups ?? []
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState(false)

  const allWords = groups.flatMap((g) => g.words)
  const foundWords = new Set(
    groups
      .filter((g) => foundGroups.includes(g.category))
      .flatMap((g) => g.words)
  )
  const remaining = allWords.filter((w) => !foundWords.has(w))

  function toggleWord(word: string) {
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
    if (selected.size !== 4) return
    onSubmitGroup(Array.from(selected))
    setSelected(new Set())
    setWrong(false)
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
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                className={`px-2 py-3 font-bold text-sm text-center border-2 ${
                  isSelected
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-white text-ink border-muted/30 hover:border-ink'
                }`}
              >
                {word}
              </button>
            )
          })}
        </div>
      )}

      {wrong && (
        <p className="text-coral font-bold text-center text-sm">Not a group — try again!</p>
      )}

      <button
        className="btn-sketch bg-grape text-paper w-full font-bold disabled:opacity-40"
        disabled={selected.size !== 4}
        onClick={handleSubmit}
      >
        Submit Group ({selected.size}/4)
      </button>

      {myState && (
        <p className="text-center font-bold text-sm text-muted">
          Score: <span className="text-grape font-black">{myState.points} pts</span>
        </p>
      )}
    </div>
  )
}
