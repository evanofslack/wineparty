import { createContext, useContext, useReducer, Dispatch } from 'react'
import type { GameState } from '../types/game'

export type GameAction =
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CONNECTED'; connected: boolean }

export interface GameStore {
  gameState: GameState | null
  error: string | null
  connected: boolean
}

const initialStore: GameStore = {
  gameState: null,
  error: null,
  connected: false,
}

function gameReducer(store: GameStore, action: GameAction): GameStore {
  switch (action.type) {
    case 'SET_STATE':
      return { ...store, gameState: action.state, error: null }
    case 'SET_ERROR':
      return { ...store, error: action.message }
    case 'CLEAR_ERROR':
      return { ...store, error: null }
    case 'SET_CONNECTED':
      return { ...store, connected: action.connected }
    default:
      return store
  }
}

export const GameContext = createContext<{
  store: GameStore
  dispatch: Dispatch<GameAction>
} | null>(null)

export function useGameStore() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameStore must be used inside GameProvider')
  return ctx
}

export function useGameReducer() {
  return useReducer(gameReducer, initialStore)
}
