import { useState, useEffect, useCallback } from 'react'
import type { MiniGameConfig, PlayerWordleState, WordleLetterState } from '../../types/game'

interface Props {
  config: MiniGameConfig
  myState: PlayerWordleState | undefined
  onGuess: (word: string) => void
}

const LETTER_COLORS: Record<WordleLetterState, string> = {
  correct: 'bg-lime text-ink border-lime',
  present: 'bg-sunny text-ink border-sunny',
  absent: 'bg-muted/40 text-paper border-muted/40',
}

const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Enter','Z','X','C','V','B','N','M','⌫'],
]

export function WordleGame({ config, myState, onGuess }: Props) {
  const word = (config.word ?? '').toUpperCase()
  const maxGuesses = config.maxGuesses ?? 6
  const wordLen = word.length
  const [current, setCurrent] = useState('')

  const guesses = myState?.guesses ?? []
  const solved = myState?.solved ?? false
  const done = solved || guesses.length >= maxGuesses

  const keyStates = useCallback((): Record<string, WordleLetterState> => {
    const map: Record<string, WordleLetterState> = {}
    for (const g of guesses) {
      g.states.forEach((s, i) => {
        const ch = g.word[i]
        const prev = map[ch]
        if (!prev || (s === 'correct') || (s === 'present' && prev === 'absent')) {
          map[ch] = s
        }
      })
    }
    return map
  }, [guesses])

  useEffect(() => {
    if (done) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        if (current.length === wordLen) {
          onGuess(current)
          setCurrent('')
        }
      } else if (e.key === 'Backspace') {
        setCurrent((c) => c.slice(0, -1))
      } else if (/^[a-zA-Z]$/.test(e.key) && current.length < wordLen) {
        setCurrent((c) => c + e.key.toUpperCase())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, done, wordLen, onGuess])

  function handleKey(key: string) {
    if (done) return
    if (key === 'Enter') {
      if (current.length === wordLen) {
        onGuess(current)
        setCurrent('')
      }
    } else if (key === '⌫') {
      setCurrent((c) => c.slice(0, -1))
    } else if (current.length < wordLen) {
      setCurrent((c) => c + key)
    }
  }

  const kStates = keyStates()

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Grid */}
      <div className="flex flex-col gap-1">
        {Array.from({ length: maxGuesses }, (_, row) => {
          const guess = guesses[row]
          const isCurrent = !guess && row === guesses.length && !done
          return (
            <div key={row} className="flex gap-1">
              {Array.from({ length: wordLen }, (_, col) => {
                let letter = ''
                let colorClass = 'border-2 border-muted/30 bg-white'
                if (guess) {
                  letter = guess.word[col] ?? ''
                  const state = guess.states[col]
                  colorClass = `border-2 ${LETTER_COLORS[state]}`
                } else if (isCurrent) {
                  letter = current[col] ?? ''
                  colorClass = letter ? 'border-2 border-ink bg-white' : 'border-2 border-muted/30 bg-white'
                }
                return (
                  <div
                    key={col}
                    className={`w-12 h-12 flex items-center justify-center font-black text-xl ${colorClass}`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {solved && (
        <p className="font-black text-lg text-lime">Solved! +{myState?.points} pts</p>
      )}
      {!solved && guesses.length >= maxGuesses && (
        <p className="font-black text-lg text-coral">The word was: {word}</p>
      )}

      {/* Keyboard */}
      {!done && (
        <div className="flex flex-col items-center gap-1 mt-2">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((k) => {
                const state = kStates[k]
                let cls = 'px-2 py-3 min-w-8 font-bold text-sm rounded border border-muted/30 '
                if (state === 'correct') cls += 'bg-lime text-ink border-lime'
                else if (state === 'present') cls += 'bg-sunny text-ink border-sunny'
                else if (state === 'absent') cls += 'bg-muted/40 text-paper border-muted/40'
                else cls += 'bg-white text-ink'
                return (
                  <button key={k} className={cls} onClick={() => handleKey(k)}>
                    {k}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
