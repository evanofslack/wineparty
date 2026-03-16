import { Leaderboard } from '../components/Leaderboard'
import { useGameStore } from '../store/gameStore'

export function DisplayView() {
  const { store } = useGameStore()
  const { gameState, connected } = store

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-pulse">🍷</div>
          <p className="text-2xl font-black text-muted">Connecting...</p>
        </div>
      </div>
    )
  }

  // Lobby
  if (!gameState || gameState.phase === 'lobby') {
    const players = gameState
      ? Object.values(gameState.players).filter((p) => p.role === 'player')
      : []

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-8">
        <div className="text-center">
          <div className="text-8xl mb-2">🍷</div>
          <h1 className="text-6xl font-black text-ink">Wine Party!</h1>
          <p className="text-2xl font-bold text-muted mt-2">Blind Tasting Challenge</p>
        </div>

        <div className="flex gap-8 items-start">
          {/* QR Codes */}
          <div className="sketch-border bg-white p-6 flex flex-col items-center gap-3">
            <p className="font-black text-lg text-ink">Join the game</p>
            <div className="w-40 h-40 sketch-border bg-paper flex items-center justify-center text-muted text-sm font-semibold">
              QR → /
            </div>
            <p className="text-sm font-bold text-muted">Scan to join</p>
          </div>

          {/* Player list */}
          <div className="sketch-border bg-white p-6 min-w-64">
            <p className="font-black text-lg mb-3 text-ink">
              Players ({players.length})
            </p>
            {players.length === 0 ? (
              <p className="text-muted font-semibold">Waiting for players...</p>
            ) : (
              <ul className="space-y-2">
                {players.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 font-semibold">
                    <span className={`w-3 h-3 rounded-full ${p.connected ? 'bg-lime' : 'bg-muted/40'}`} />
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Guessing phase
  if (gameState.phase === 'guessing') {
    const round = gameState.rounds[gameState.currentRound]
    const players = Object.values(gameState.players).filter((p) => p.role === 'player')
    const submitted = round.guesses.length

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-8">
        <div className="text-center">
          <p className="text-xl font-bold text-muted uppercase tracking-wider">
            Round {gameState.currentRound + 1} of {gameState.rounds.length}
          </p>
          <h2 className="text-5xl font-black text-ink mt-1">{round.wine.name}</h2>
          {round.wine.hint && (
            <p className="text-xl text-muted font-semibold mt-2">Hint: {round.wine.hint}</p>
          )}
        </div>

        <div className="sketch-border-lg bg-white px-8 py-6 text-center">
          <p className="text-lg font-bold text-muted">Guesses submitted</p>
          <p className="text-7xl font-black text-grape">{submitted}</p>
          <p className="text-lg font-bold text-muted">of {players.length} players</p>
        </div>

        <div className="w-full max-w-lg">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Current Standings</p>
          <Leaderboard entries={gameState.leaderboard} />
        </div>
      </div>
    )
  }

  // Scoring phase
  if (gameState.phase === 'scoring') {
    const round = gameState.rounds[gameState.currentRound]

    return (
      <div className="flex gap-12 items-start justify-center min-h-screen px-12 py-10">
        {/* Wine reveal */}
        <div className="flex flex-col gap-6 flex-1 max-w-sm">
          <div className="sketch-border-lg bg-grape text-white px-6 py-6">
            <p className="text-sm font-bold opacity-70 uppercase tracking-wider">The wine was...</p>
            <h2 className="text-4xl font-black mt-1">{round.wine.variety}</h2>
            <p className="text-xl font-semibold mt-1">{round.wine.region}</p>
            <p className="text-2xl font-black mt-1">{round.wine.year}</p>
          </div>

          {/* Round scores */}
          <div className="sketch-border bg-white px-4 py-4">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Round Scores</p>
            {round.scores
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((s) => {
                const player = gameState.players[s.playerId]
                return (
                  <div key={s.playerId} className="flex justify-between items-center py-1.5 border-b last:border-0 border-paper">
                    <span className="font-semibold">{player?.name ?? s.playerId}</span>
                    <span className="font-black text-grape">+{s.points}</span>
                  </div>
                )
              })}
            {round.scores.length === 0 && (
              <p className="text-muted text-sm">No guesses submitted</p>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="flex-1 max-w-sm">
          <h3 className="text-2xl font-black mb-4">Leaderboard</h3>
          <Leaderboard entries={gameState.leaderboard} />
        </div>
      </div>
    )
  }

  // Complete
  if (gameState.phase === 'complete') {
    const winner = gameState.leaderboard[0]
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-8">
        <div className="text-8xl">🏆</div>
        <h1 className="text-6xl font-black text-center">
          {winner ? `${winner.playerName} wins!` : 'Game Over!'}
        </h1>
        {winner && (
          <div className="sketch-border-lg bg-sunny/50 px-8 py-6 text-center">
            <p className="text-3xl font-black text-grape">{winner.score} points</p>
          </div>
        )}
        <div className="w-full max-w-md">
          <Leaderboard entries={gameState.leaderboard} />
        </div>
      </div>
    )
  }

  // Mini-game placeholder
  if (gameState.phase === 'minigame') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-8xl">🎮</div>
        <h2 className="text-4xl font-black">Mini Game!</h2>
        <p className="text-2xl text-muted font-semibold">Coming soon...</p>
      </div>
    )
  }

  return null
}
