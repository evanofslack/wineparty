import { PlayerAvatar } from './PlayerAvatar'
import type { Player, LeaderboardEntry } from '../types/game'

interface Props {
  players: Player[]
  leaderboard: LeaderboardEntry[]
  showRanks?: boolean
}

export function DisplayPlayerBar({ players, leaderboard, showRanks }: Props) {
  const rankMap = new Map(leaderboard.map((e) => [e.playerId, e]))

  const sorted = showRanks
    ? [...players].sort((a, b) => {
        const ra = rankMap.get(a.id)?.rank ?? 999
        const rb = rankMap.get(b.id)?.rank ?? 999
        return ra - rb
      })
    : [...players].sort((a, b) =>
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      )

  if (sorted.length === 0) return null

  const rankLabel = (rank: number | undefined) => {
    if (!showRanks || rank === undefined) return null
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="flex items-end justify-center gap-5 px-8 py-3 sketch-border bg-sunny/15 mx-4 mb-4">
      {sorted.map((player) => {
        const entry = rankMap.get(player.id)
        const label = rankLabel(entry?.rank)
        return (
          <div
            key={player.id}
            className={`flex flex-col items-center gap-1 transition-opacity ${!player.connected ? 'opacity-40' : ''}`}
          >
            <div className="relative">
              <PlayerAvatar player={player} size={80} />
              {label && (
                <span className="absolute -top-1 -left-1 text-sm font-black leading-none">{label}</span>
              )}
            </div>
            <span
              className="text-base font-black text-ink truncate text-center leading-tight"
              style={{ maxWidth: 84 }}
            >
              {player.name || 'Anon'}
            </span>
            <span
              className="text-base font-black tabular-nums"
              style={{ color: player.color || 'inherit' }}
            >
              {entry?.combinedScore ?? player.totalScore + player.miniGameScore}
            </span>
          </div>
        )
      })}
    </div>
  )
}
