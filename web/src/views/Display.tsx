import { Leaderboard } from '../components/Leaderboard'
import { useGameStore } from '../store/gameStore'
import type { LeaderboardEntry, Player, WineRatingSummary } from '../types/game'

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
    const liveEntries = gameState.leaderboard.length > 0
      ? gameState.leaderboard
      : playersAsLeaderboard(gameState.players)

    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-12 py-10">
        <div className="fixed top-6 left-8">
          <span className="text-2xl font-black text-grape">{APP_NAME}</span>
        </div>
        <div className="fixed top-6 right-8">
          <div className="sketch-border bg-white px-5 py-3 text-center">
            <p className="text-sm font-bold text-muted uppercase tracking-wider">
              Round {gameState.currentRound + 1} of {gameState.rounds.length}
            </p>
            <p className="text-2xl font-black text-ink">{round.wine.name}</p>
            <p className="text-lg font-bold text-muted mt-1">
              {submitted} / {players.length} guesses
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Current Standings</p>
          <Leaderboard entries={liveEntries} />
        </div>
      </div>
    )
  }

  // Scoring phase
  if (gameState.phase === 'scoring') {
    const round = gameState.rounds[gameState.currentRound]

    return (
      <div className="flex gap-12 items-start justify-center min-h-screen px-12 py-10">
        <div className="fixed top-6 left-8">
          <span className="text-2xl font-black text-grape">{APP_NAME}</span>
        </div>
        {/* Wine reveal */}
        <div className="flex flex-col gap-6 flex-1 max-w-sm">
          <div className="sketch-border-lg bg-grape text-white px-6 py-6">
            <p className="text-sm font-bold opacity-70 uppercase tracking-wider">The wine was...</p>
            <h2 className="text-4xl font-black mt-1">{round.wine.name}</h2>
            <p className="text-2xl font-bold mt-1">{round.wine.variety}</p>
            <p className="text-xl font-semibold mt-1">{round.wine.country} · {round.wine.region}</p>
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
    const summary = gameState.summary

    function HighlightCard({ label, wrs }: { label: string; wrs: WineRatingSummary }) {
      const stdDev = Math.sqrt(wrs.variance)
      return (
        <div className="sketch-border bg-white px-4 py-4 flex-1 min-w-40">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="font-black text-lg text-ink leading-tight">{wrs.wineName} ({wrs.wineVariety}) #{wrs.roundIndex + 1}</p>
          <p className="text-2xl font-black text-grape">{wrs.avgRating.toFixed(1)}<span className="text-base font-semibold text-muted">/10</span></p>
          <p className="text-xs text-muted font-semibold">±{stdDev.toFixed(2)} · {wrs.ratedCount} rating{wrs.ratedCount !== 1 ? 's' : ''}</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center min-h-screen gap-8 px-8 py-10">
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
        {summary && (
          <div className="w-full max-w-2xl">
            <p className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Wine Ratings</p>
            {(summary.mostPopular || summary.leastLiked || summary.mostContested) && (
              <div className="flex gap-4 mb-6 flex-wrap">
                {summary.mostPopular && <HighlightCard label="Most Popular" wrs={summary.mostPopular} />}
                {summary.leastLiked && summary.leastLiked.wineName !== summary.mostPopular?.wineName && (
                  <HighlightCard label="Least Liked" wrs={summary.leastLiked} />
                )}
                {summary.mostContested && <HighlightCard label="Most Divisive" wrs={summary.mostContested} />}
              </div>
            )}
            <div className="sketch-border bg-white px-4 py-4">
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
