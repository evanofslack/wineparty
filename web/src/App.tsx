import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameContext, useGameReducer } from './store/gameStore'
import { useGameSocket } from './hooks/useGameSocket'
import { useIdentity } from './hooks/useIdentity'
import { PlayerView } from './views/Player'
import { DisplayView } from './views/Display'
import { AdminView } from './views/Admin'

function AppRoutes() {
  const [store, dispatch] = useGameReducer()
  const { sendJoin, sendGuess, sendAdminAction } = useGameSocket(dispatch)
  const { playerId, playerName, setPlayerName } = useIdentity()

  return (
    <GameContext.Provider value={{ store, dispatch }}>
      <Routes>
        <Route
          path="/"
          element={
            <PlayerView
              playerId={playerId}
              playerName={playerName}
              setPlayerName={setPlayerName}
              sendJoin={sendJoin}
              sendGuess={sendGuess}
            />
          }
        />
        <Route path="/display" element={<DisplayView />} />
        <Route
          path="/admin"
          element={
            <AdminView
              playerId={playerId}
              sendJoin={sendJoin}
              sendAdminAction={sendAdminAction}
            />
          }
        />
      </Routes>
    </GameContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
