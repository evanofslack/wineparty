import { Leaderboard } from '../components/Leaderboard'
import { useGameStore } from '../store/gameStore'
import type { LeaderboardEntry, Player } from '../types/game'

const APP_NAME = 'Wine Party'

function playersAsLeaderboard(players: Record<string, Player>): LeaderboardEntry[] {
  return Object.values(players)
    .filter((p) => p.role === 'player')
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      playerName: p.name,
      score: p.totalScore,
    }))
}

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
        <div className="fixed top-6 left-8">
          <span className="text-2xl font-black text-grape">{APP_NAME}</span>
        </div>
        <div className="text-center">
          <div className="text-8xl mb-2">🍷</div>
          <h1 className="text-6xl font-black text-ink">{APP_NAME}!</h1>
          <p className="text-2xl font-bold text-muted mt-2">Blind Tasting Challenge</p>
        </div>

        <div className="flex gap-8 items-start">
          {/* QR Codes */}
          <div className="sketch-border-sunny bg-sunny/15 p-6 flex flex-col items-center gap-3">
            <p className="font-black text-lg text-ink">Join the game</p>
            <div className="w-40 h-40 sketch-border bg-paper flex items-center justify-center text-muted text-sm font-semibold">
              QR → /
            </div>
            <p className="text-sm font-bold text-muted">Scan to join</p>
          </div>

          {/* Player list */}
          <div className="sketch-border-sky bg-sky/15 p-6 min-w-64">
            <p className="font-black text-lg mb-3 text-ink">
              Players ({players.length})
            </p>
            {players.length === 0 ? (
              <p className="text-muted font-semibold">Waiting for players...</p>
            ) : (
              <ul className="space-y-2">
                {players.map((p, i) => (
                  <li key={p.id} className={`flex items-center gap-2 font-semibold px-2 py-1 rounded ${i % 2 === 0 ? 'bg-lime/10' : 'bg-white/60'}`}>
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
    const liveEntries = gameState.leaderboard.length > 0
      ? gameState.leaderboard
      : playersAsLeaderboard(gameState.players)

    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="fixed top-6 left-8">
          <span className="text-2xl font-black text-grape">{APP_NAME}</span>
        </div>
        <div className="fixed top-6 right-8">
          <div className="sketch-border-sunny bg-sunny/20 px-5 py-3 text-center">
            <p className="text-sm font-bold text-muted uppercase tracking-wider">
              Round {gameState.currentRound + 1} of {gameState.rounds.length}
            </p>
            <p className="text-2xl font-black text-ink">{round.wine.name}</p>
            <p className="text-lg font-bold mt-1">
              <span className="text-coral font-black">{submitted}</span> / <span className="text-lime font-black">{players.length}</span> guesses
            </p>
          </div>
        </div>

        <div className="w-3/5">
          <div className="sketch-border-sky bg-sky/10 px-6 py-4">
            <p className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Current Standings</p>
            <Leaderboard entries={liveEntries} />
          </div>
        </div>
      </div>
    )
  }

  // Scoring phase
  if (gameState.phase === 'scoring') {
    const round = gameState.rounds[gameState.currentRound]

    return (
      <div className="grid grid-cols-2 gap-8 min-h-screen p-10">
        <div className="fixed top-6 left-8">
          <span className="text-2xl font-black text-grape">{APP_NAME}</span>
        </div>
        {/* Wine reveal + round scores */}
        <div className="flex flex-col gap-6 pt-12">
          <div className="sketch-border-burgundy px-6 py-6" style={{ backgroundColor: 'rgba(114,47,55,0.15)' }}>
            <p className="text-sm font-bold text-muted uppercase tracking-wider">The wine was...</p>
            <h2 className="text-4xl font-black mt-1 text-ink">{round.wine.name}</h2>
            <p className="text-2xl font-bold mt-1 text-ink">{round.wine.variety}</p>
            <p className="text-xl font-semibold mt-1 text-muted">{round.wine.country} · {round.wine.region}</p>
            <p className="text-2xl font-black mt-1" style={{ color: '#722F37' }}>{round.wine.year}</p>
          </div>

          {/* Round scores */}
          <div className="sketch-border-sunny bg-sunny/15 px-4 py-4">
            <p className="font-bold text-sm text-muted uppercase tracking-wider mb-3">Round Scores</p>
            {round.scores
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((s) => {
                const player = gameState.players[s.playerId]
                return (
                  <div key={s.playerId} className="flex justify-between items-center py-1.5 border-b last:border-0 border-paper">
                    <span className="font-semibold">{player?.name ?? s.playerId}</span>
                    <span className="font-black text-ink">+{s.points}</span>
                  </div>
                )
              })}
            {round.scores.length === 0 && (
              <p className="text-muted text-sm">No guesses submitted</p>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="flex flex-col pt-12">
          <div className="sketch-border-lime bg-lime/10 px-4 py-4">
            <h3 className="text-2xl font-black mb-4">Leaderboard</h3>
            <Leaderboard entries={gameState.leaderboard} />
          </div>
        </div>
      </div>
    )
  }

  // Complete
  if (gameState.phase === 'complete') {
    const winner = gameState.leaderboard[0]
    const summary = gameState.summary

    return (
      <div className="flex flex-col min-h-screen p-10 gap-8">
        {/* Winner banner */}
        <div className="sketch-border-lg bg-sunny/30 px-8 py-6 text-center w-full">
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="text-5xl font-black">
            {winner ? `${winner.playerName} wins!` : 'Game Over!'}
          </h1>
          {winner && <p className="text-3xl font-black text-grape mt-1">{winner.score} points</p>}
        </div>

        <div className="grid grid-cols-2 gap-8 flex-1">
          {/* Left: Leaderboard */}
          <div className="sketch-border-sky bg-sky/10 px-4 py-4">
            <h3 className="text-2xl font-black mb-4">Final Standings</h3>
            <Leaderboard entries={gameState.leaderboard} />
          </div>

          {/* Right: Wine ratings */}
          {summary && (
            <div className="flex flex-col gap-4">
              {(summary.mostPopular || summary.leastLiked || summary.mostContested) && (
                <div className="flex flex-col gap-3">
                  {summary.mostPopular && (
                    <div className="sketch-border-lime bg-lime/15 px-4 py-4">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Most Popular</p>
                      <p className="font-black text-lg text-ink leading-tight">{summary.mostPopular.wineName} ({summary.mostPopular.wineVariety}) #{summary.mostPopular.roundIndex + 1}</p>
                      <p className="text-2xl font-black text-grape">{summary.mostPopular.avgRating.toFixed(1)}<span className="text-base font-semibold text-muted">/10</span></p>
                      <p className="text-xs text-muted font-semibold">±{Math.sqrt(summary.mostPopular.variance).toFixed(2)} · {summary.mostPopular.ratedCount} rating{summary.mostPopular.ratedCount !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {summary.leastLiked && summary.leastLiked.wineName !== summary.mostPopular?.wineName && (
                    <div className="sketch-border-coral bg-coral/15 px-4 py-4">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Least Liked</p>
                      <p className="font-black text-lg text-ink leading-tight">{summary.leastLiked.wineName} ({summary.leastLiked.wineVariety}) #{summary.leastLiked.roundIndex + 1}</p>
                      <p className="text-2xl font-black text-grape">{summary.leastLiked.avgRating.toFixed(1)}<span className="text-base font-semibold text-muted">/10</span></p>
                      <p className="text-xs text-muted font-semibold">±{Math.sqrt(summary.leastLiked.variance).toFixed(2)} · {summary.leastLiked.ratedCount} rating{summary.leastLiked.ratedCount !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {summary.mostContested && (
                    <div className="sketch-border-sky bg-sky/15 px-4 py-4">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Most Divisive</p>
                      <p className="font-black text-lg text-ink leading-tight">{summary.mostContested.wineName} ({summary.mostContested.wineVariety}) #{summary.mostContested.roundIndex + 1}</p>
                      <p className="text-2xl font-black text-grape">{summary.mostContested.avgRating.toFixed(1)}<span className="text-base font-semibold text-muted">/10</span></p>
                      <p className="text-xs text-muted font-semibold">±{Math.sqrt(summary.mostContested.variance).toFixed(2)} · {summary.mostContested.ratedCount} rating{summary.mostContested.ratedCount !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="sketch-border-sky bg-sky/10 px-4 py-4">
                <p className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Wine Ratings</p>
                {summary.wineRatings.map((wr) => (
                  <div key={wr.roundIndex} className="flex justify-between items-center py-1.5 border-b last:border-0 border-paper">
                    <span className="font-semibold">{wr.wineName} ({wr.wineVariety}) #{wr.roundIndex + 1}</span>
                    <span className="font-black text-grape">
                      {wr.ratedCount > 0 ? `${wr.avgRating.toFixed(1)}/10` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
