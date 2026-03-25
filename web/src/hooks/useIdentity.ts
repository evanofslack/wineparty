import { useState } from 'react'

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b, i) => {
      const hex = b.toString(16).padStart(2, '0')
      return [4, 6, 8, 10].includes(i) ? '-' + hex : hex
    })
    .join('')
}

export function useIdentity() {
  const [playerId] = useState<string>(() => {
    let id = localStorage.getItem('wineparty_player_id')
    if (!id) {
      id = generateId()
      localStorage.setItem('wineparty_player_id', id)
    }
    return id
  })

  const [playerName, setPlayerNameState] = useState<string>(
    () => localStorage.getItem('wineparty_player_name') ?? ''
  )

  function setPlayerName(name: string) {
    localStorage.setItem('wineparty_player_name', name)
    setPlayerNameState(name)
  }

  return { playerId, playerName, setPlayerName }
}
