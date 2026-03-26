import { useEffect, useRef, useState } from 'react'
import { PlayerAvatar } from './PlayerAvatar'
import type { LeaderboardEntry, Player } from '../types/game'

interface Props {
  entries: LeaderboardEntry[]
  highlightId?: string
  players?: Record<string, Player>
}

const RANK_COLORS = ['var(--color-sunny)', 'var(--color-muted)', '#CD7F32']
const RANK_LABELS = ['🥇', '🥈', '🥉']

export function Leaderboard({ entries, highlightId, players }: Props) {
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

  useEffect(() => {
    function onHide() {
      if (document.hidden) setAnimating(new Set())
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

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

        const borderClass = e.rank === 1 ? 'sketch-border-sunny' : e.rank === 2 ? 'sketch-border-sky' : e.rank === 3 ? 'sketch-border-coral' : 'sketch-border'
        const bgStyle = e.rank === 1 ? 'rgba(255,230,109,0.25)' : e.rank === 2 ? 'rgba(78,205,196,0.20)' : e.rank === 3 ? 'rgba(255,107,107,0.15)' : 'white'
        const ringClass = e.rank === 1 ? 'ring-sunny' : e.rank === 2 ? 'ring-sky' : e.rank === 3 ? 'ring-coral' : 'ring-ink'

        const player = players?.[e.playerId]
        return (
          <div
            key={e.playerId}
            className={`flex items-center gap-3 px-4 py-3 w-full ${borderClass} transition-transform ${
              isAnimating ? 'scale-105' : ''
            } ${isHighlight ? `ring-2 ${ringClass} ring-offset-1` : ''}`}
            style={{ backgroundColor: bgStyle }}
          >
            <span
              className="text-xl w-10 text-center font-black shrink-0"
              style={{ color: rankColor }}
            >
              {rankLabel}
            </span>
            {player && <PlayerAvatar player={player} size={36} />}
            <span className="flex-1 font-bold text-ink truncate">{e.playerName}</span>
            <span
              className={`text-xl font-black tabular-nums transition-[color,transform] w-16 text-right shrink-0 ${isAnimating ? 'text-grape scale-110' : 'text-ink'}`}
            >
              {e.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}
