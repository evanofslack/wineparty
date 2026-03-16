import { useEffect, useRef, useCallback } from 'react'
import type { Dispatch } from 'react'
import {
  MessageType,
  type Envelope,
  type GameState,
  type JoinPayload,
  type GuessPayload,
  type AdminActionPayload,
} from '../types/game'
import type { GameAction } from '../store/gameStore'

const WS_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
    : 'ws://localhost:8080/ws'

export function useGameSocket(dispatch: Dispatch<GameAction>) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    const socket = new WebSocket(WS_URL)
    ws.current = socket

    socket.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', connected: true })
    }

    socket.onmessage = (event) => {
      try {
        const env = JSON.parse(event.data) as Envelope
        switch (env.type) {
          case MessageType.MsgGameState:
            dispatch({ type: 'SET_STATE', state: env.payload as GameState })
            break
          case MessageType.MsgError:
            dispatch({ type: 'SET_ERROR', message: (env.payload as { message: string }).message })
            break
        }
      } catch {
        console.error('Failed to parse WS message', event.data)
      }
    }

    socket.onclose = () => {
      dispatch({ type: 'SET_CONNECTED', connected: false })
      if (mountedRef.current) {
        reconnectTimeout.current = setTimeout(connect, 2000)
      }
    }

    socket.onerror = () => {
      socket.close()
    }
  }, [dispatch])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [connect])

  function send<T>(type: MessageType, payload: T) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }))
    }
  }

  function sendJoin(payload: JoinPayload) {
    send(MessageType.MsgJoin, payload)
  }

  function sendGuess(payload: GuessPayload) {
    send(MessageType.MsgGuessSubmit, payload)
  }

  function sendAdminAction(payload: AdminActionPayload) {
    send(MessageType.MsgAdminAction, payload)
  }

  return { sendJoin, sendGuess, sendAdminAction }
}
