import type { Player } from '../types/game'

interface Props {
  player: Player
  size?: number
}

export function PlayerAvatar({ player, size = 48 }: Props) {
  const cellSize = size / 8
  const avatar = player.avatar && player.avatar.length === 64 ? player.avatar : '0'.repeat(64)
  const color = player.color || '#888888'

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: `3px solid ${color}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${cellSize}px)`,
          width: size,
          height: size,
        }}
      >
        {Array.from(avatar).map((cell, i) => (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor:
                cell === '1' ? '#333333' :
                cell === '2' ? '#ffffff' :
                color,
            }}
          />
        ))}
      </div>
    </div>
  )
}
