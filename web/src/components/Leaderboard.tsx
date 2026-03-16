import { useEffect, useRef, useState } from 'react'
import type { LeaderboardEntry } from '../types/game'

interface Props {
  entries: LeaderboardEntry[]
  highlightId?: string
}

const RANK_COLORS = ['var(--color-sunny)', 'var(--color-muted)', '#CD7F32']
const RANK_LABELS = ['🥇', '🥈', '🥉']

export function Leaderboard({ entries, highlightId }: Props) {
  const prevScores = useRef<Record<string, number>>({})
  const [animating, setAnimating] = useState<Set<string>>(new Set())

  useEffect(() => {
    const newAnimating = new Set<string>()
    for (const e of entries) {
      if (prevScores.current[e.playerId] !== undefined && prevScores.current[e.playerId] !== e.score) {
        newAnimating.add(e.playerId)
      }
    }
    if (newAnimating.size > 0) {
      setAnimating(newAnimating)
      const t = setTimeout(() => setAnimating(new Set()), 600)
      return () => clearTimeout(t)
    }
    return undefined
  }, [entries])

  useEffect(() => {
    const scores: Record<string, number> = {}
    for (const e of entries) scores[e.playerId] = e.score
    prevScores.current = scores
  }, [entries])

  if (entries.length === 0) {
    return <p className="text-center text-muted font-semibold">No players yet</p>
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {entries.map((e) => {
        const isHighlight = e.playerId === highlightId
        const isAnimating = animating.has(e.playerId)
        const rankColor = e.rank <= 3 ? RANK_COLORS[e.rank - 1] : 'var(--color-paper)'
        const rankLabel = e.rank <= 3 ? RANK_LABELS[e.rank - 1] : `#${e.rank}`

        return (
          <div
            key={e.playerId}
            className={`flex items-center gap-3 px-4 py-3 sketch-border transition-transform ${
              isAnimating ? 'scale-105' : ''
            } ${isHighlight ? 'ring-2 ring-grape ring-offset-1' : ''}`}
            style={{ backgroundColor: isHighlight ? '#f0e8f7' : 'white' }}
          >
            <span
              className="text-xl w-10 text-center font-black shrink-0"
              style={{ color: rankColor }}
            >
              {rankLabel}
            </span>
            <span className="flex-1 font-bold text-ink truncate">{e.playerName}</span>
            <span
              className={`text-xl font-black transition-all ${isAnimating ? 'text-grape scale-110' : 'text-ink'}`}
            >
              {e.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}
