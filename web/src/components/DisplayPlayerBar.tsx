import { PlayerAvatar } from './PlayerAvatar'
import type { Player, LeaderboardEntry } from '../types/game'

interface Props {
  players: Player[]
  leaderboard: LeaderboardEntry[]
}

export function DisplayPlayerBar({ players, leaderboard }: Props) {
  const rankMap = new Map(leaderboard.map((e) => [e.playerId, e]))

  const sorted = [...players].sort((a, b) =>
    new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  )

  if (sorted.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-5 px-8 py-3 border-t-2 border-ink/15 bg-ink/5 flex-shrink-0">
      {sorted.map((player) => {
        const entry = rankMap.get(player.id)
        return (
          <div
            key={player.id}
            className={`flex flex-col items-center gap-1 transition-opacity ${!player.connected ? 'opacity-40' : ''}`}
          >
            <PlayerAvatar player={player} size={64} />
            <span
              className="text-sm font-black text-ink truncate text-center leading-tight"
              style={{ maxWidth: 72 }}
            >
              {player.name || 'Anon'}
            </span>
            <span
              className="text-sm font-black tabular-nums"
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
