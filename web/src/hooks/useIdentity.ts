import { useState } from 'react'

function generateId(): string {
  return crypto.randomUUID()
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
