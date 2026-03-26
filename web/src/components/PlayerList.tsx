import type { Player } from '../types/game'

interface Props {
  players: Player[]
}

export function PlayerList({ players }: Props) {
  const activePlayers = players.filter((p) => p.role === 'player')

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-muted uppercase tracking-wider">
        Players ({activePlayers.length})
      </p>
      {activePlayers.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 px-3 py-2 sketch-border bg-white"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              p.connected ? 'bg-lime' : 'bg-muted/40'
            }`}
          />
          <span className="font-semibold flex-1 truncate">{p.name || 'Anonymous'}</span>
          <span className="text-sm font-bold text-grape">{p.totalScore + p.miniGameScore}pt</span>
        </div>
      ))}
      {activePlayers.length === 0 && (
        <p className="text-muted text-sm">No players yet — share the link!</p>
      )}
    </div>
  )
}
