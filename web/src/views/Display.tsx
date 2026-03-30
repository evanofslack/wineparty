import { CountdownTimer } from '../components/CountdownTimer'
import { MiniGameDisplay } from '../components/minigames/MiniGameDisplay'
import { DisplayPlayerBar } from '../components/DisplayPlayerBar'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { useGameStore } from '../store/gameStore'
import type { LeaderboardEntry, Player } from '../types/game'

const APP_NAME = 'Wine Party'

function playersAsLeaderboard(players: Record<string, Player>): LeaderboardEntry[] {
  return Object.values(players)
    .filter((p) => p.role === 'player')
    .sort((a, b) => (b.totalScore + b.miniGameScore) - (a.totalScore + a.miniGameScore))
    .map((p, i) => {
      const combined = p.totalScore + p.miniGameScore
      return {
        rank: i + 1,
        playerId: p.id,
        playerName: p.name,
        score: combined,
        miniGameScore: p.miniGameScore,
        combinedScore: combined,
      }
    })
}

export function DisplayView() {
  const { store } = useGameStore()
  const { gameState, connected } = store

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-screen overflow-hidden">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-pulse">🍷</div>
          <p className="text-2xl font-black text-muted">Connecting...</p>
        </div>
      </div>
    )
  }

  const allPlayers = gameState
    ? Object.values(gameState.players).filter((p) => p.role === 'player')
    : []
  const leaderboard = gameState
    ? (gameState.leaderboard.length > 0 ? gameState.leaderboard : playersAsLeaderboard(gameState.players))
    : []

  // Lobby
  if (!gameState || gameState.phase === 'lobby') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 grid grid-cols-2 min-h-0">
          <div className="flex flex-col items-center justify-center gap-10 p-12 border-r border-ink/10">
            <div className="text-center">
              <div className="text-8xl mb-4">🍷</div>
              <h1 className="text-7xl font-black text-ink">{APP_NAME}!</h1>
              <p className="text-3xl font-bold text-muted mt-3">Blind Tasting Challenge</p>
            </div>
            <div className="sketch-border-sunny bg-sunny/15 p-8 flex flex-col items-center gap-4">
              <p className="font-black text-2xl text-ink">Join the game</p>
              <div className="w-48 h-48 sketch-border bg-paper flex items-center justify-center text-muted text-sm font-semibold">
                QR → /
              </div>
              <p className="text-xl font-bold text-muted">Scan to join</p>
            </div>
          </div>

          <div className="flex flex-col justify-center p-12">
            {allPlayers.length > 0 ? (
              <div className="sketch-border bg-white p-8 h-full flex flex-col">
                <p className="font-black text-3xl mb-6 text-ink">
                  Players ({allPlayers.length})
                </p>
                <ul className="flex flex-col gap-2 overflow-hidden">
                  {allPlayers.map((p) => (
                    <li key={p.id} className="flex items-center gap-4 px-4 py-2 sketch-border bg-white/80">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${p.connected ? 'bg-lime' : 'bg-muted/40'}`} />
                      <PlayerAvatar player={p} size={40} />
                      <span className="text-xl font-bold text-ink truncate">{p.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
                <p className="text-4xl font-black">Waiting for players...</p>
                <p className="text-2xl font-bold">Share the link to join</p>
              </div>
            )}
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Game intro
  if (gameState.phase === 'game_intro') {
    const numWines = gameState.rounds.length
    const numMiniGames = gameState.miniGameSchedule.length
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-10 p-16">
          <div className="text-center">
            <div className="text-8xl mb-4">🍷</div>
            <h1 className="text-7xl font-black text-ink">{APP_NAME}</h1>
            <p className="text-3xl font-bold text-muted mt-2">Blind Tasting Challenge</p>
          </div>
          <div className="flex gap-6">
            <div className="sketch-border bg-white px-10 py-6 text-center">
              <p className="text-6xl font-black text-ink">{numWines}</p>
              <p className="text-xl font-bold text-muted mt-1">Wines</p>
            </div>
            {numMiniGames > 0 && (
              <div className="sketch-border bg-white px-10 py-6 text-center">
                <p className="text-6xl font-black text-ink">{numMiniGames}</p>
                <p className="text-xl font-bold text-muted mt-1">Mini-Games</p>
              </div>
            )}
          </div>
          <div className="sketch-border bg-white px-10 py-6 w-full max-w-xl text-center">
            <p className="text-xl font-semibold text-muted">Taste each wine blind, earn points for correctly identifying its details, and compete in mini-games between rounds.</p>
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Tasting intro
  if (gameState.phase === 'tasting_intro') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-16">
          <div className="text-center">
            <span className="inline-block text-xs font-black px-3 py-1 bg-sunny text-ink uppercase tracking-wider mb-4">Wine Tasting</span>
            <h2 className="text-6xl font-black text-ink">How Tasting Works</h2>
            <p className="text-2xl font-bold text-muted mt-2">You'll taste each wine blind and guess its details</p>
          </div>
          <div className="sketch-border bg-white px-12 py-8 w-full max-w-2xl">
            <div className="flex flex-col divide-y divide-paper">
              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="font-black text-xl text-ink">Grape Variety</p>
                  <p className="text-sm text-muted">Name the grape (e.g. Cabernet Sauvignon)</p>
                </div>
                <span className="font-black text-2xl text-grape shrink-0 ml-6">3 pts</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="font-black text-xl text-ink">Region</p>
                  <p className="text-sm text-muted">Country or specific region</p>
                </div>
                <span className="font-black text-2xl text-grape shrink-0 ml-6">2 pts</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="font-black text-xl text-ink">Vintage Year</p>
                  <p className="text-sm text-muted">Exact: 3 pts &nbsp;·&nbsp; ±1 year: 2 pts &nbsp;·&nbsp; ±2 years: 1 pt</p>
                </div>
                <span className="font-black text-2xl text-grape shrink-0 ml-6">1–3 pts</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="font-black text-xl text-ink">Flavor Notes</p>
                  <p className="text-sm text-muted">1 pt each for correct notes, up to 3</p>
                </div>
                <span className="font-black text-2xl text-grape shrink-0 ml-6">1–3 pts</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-ink/20">
              <span className="font-black text-xl text-ink">Maximum per wine</span>
              <span className="font-black text-3xl text-grape">11 pts</span>
            </div>
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Mini-game intro
  if (gameState.phase === 'minigame_intro' && gameState.miniGame) {
    const gameType = gameState.miniGame.config.type
    const miniGameIndex = gameState.miniGameSchedule.indexOf(gameState.currentRound) + 1
    const totalMiniGames = gameState.miniGameSchedule.length
    const GAME_BADGE: Record<string, string> = {
      trivia:       'bg-grape text-white',
      fibbage:      'bg-sky text-ink',
      quiplash:     'bg-coral text-white',
      wordle:       'bg-lime text-ink',
      connections:  'bg-sunny text-ink',
      emoji_decode: 'bg-sunny text-ink',
    }
    const MINIGAME_INFO: Record<string, { title: string; description: string; points: string }> = {
      trivia: {
        title: 'Trivia',
        description: 'Answer multiple choice questions as fast as you can.',
        points: 'Points per correct answer — faster answers score more.',
      },
      fibbage: {
        title: 'Fibbage',
        description: 'Write a fake answer to fool your friends. Then vote for the one you think is real.',
        points: '+3 pts for guessing correctly · +2 pts per player you fool.',
      },
      quiplash: {
        title: 'Quiplash',
        description: 'Write the funniest response to each prompt. Players vote for their favorite.',
        points: '+2 pts per vote you receive.',
      },
      wordle: {
        title: 'Wordle',
        description: 'Guess the hidden 5-letter word. Green = right spot · Yellow = wrong spot · Gray = not in word.',
        points: 'Fewer guesses = more points (up to 12 pts).',
      },
      connections: {
        title: 'Connections',
        description: 'Sort 16 words into 4 groups that share a hidden theme. Harder groups are worth more.',
        points: 'Yellow: 1 pt · Green: 2 pts · Blue: 3 pts · Purple: 4 pts.',
      },
      emoji_decode: {
        title: 'Emoji Decode',
        description: 'Decode what phrase or title the emoji sequence represents. Answer fastest to earn the most.',
        points: 'Up to 5 pts per round — scaled by how quickly you answer.',
      },
    }
    const info = MINIGAME_INFO[gameType] ?? { title: gameType, description: '', points: '' }
    const badgeClass = GAME_BADGE[gameType] ?? 'bg-ink text-white'
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-16">
          <div className="text-center flex flex-col items-center gap-3">
            <span className={`text-xs font-black px-3 py-1 uppercase tracking-wider ${badgeClass}`}>
              {info.title}
            </span>
            <p className="text-xl font-bold text-muted">
              Mini-Game {miniGameIndex} of {totalMiniGames}
            </p>
            <h2 className="text-7xl font-black text-ink">{info.title}</h2>
          </div>
          <div className="sketch-border bg-white px-12 py-8 w-full max-w-2xl flex flex-col gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-muted mb-2">How to play</p>
              <p className="text-2xl font-semibold text-ink leading-snug">{info.description}</p>
            </div>
            <div className="border-t border-paper pt-5">
              <p className="text-sm font-black uppercase tracking-wider text-muted mb-2">Points</p>
              <p className="text-xl font-semibold text-ink">{info.points}</p>
            </div>
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Guessing phase
  if (gameState.phase === 'guessing') {
    const round = gameState.rounds[gameState.currentRound]
    const submitted = round.guesses.length

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-center justify-center min-h-0 p-12">
          <div className="sketch-border bg-white px-16 py-12 text-center w-full max-w-4xl">
            <p className="text-2xl font-bold text-muted uppercase tracking-wider">
              Round {gameState.currentRound + 1} of {gameState.rounds.length}
            </p>
            <p className="text-8xl font-black text-ink mt-4 leading-tight">{round.wine.name}</p>
            <p className="text-5xl font-bold mt-8">
              <span className="text-coral font-black">{submitted}</span>
              <span className="text-muted"> / </span>
              <span className="text-lime font-black">{allPlayers.length}</span>
              <span className="text-3xl font-bold text-muted ml-4">guesses in</span>
            </p>
            {gameState.timer && gameState.timer.durationSecs > 0 && (
              <div className="mt-8 border-t border-sunny/40 pt-8">
                <CountdownTimer timer={gameState.timer} size="lg" />
              </div>
            )}
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Scoring phase
  if (gameState.phase === 'scoring') {
    const round = gameState.rounds[gameState.currentRound]

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 grid grid-cols-2 min-h-0">
          <div className="flex flex-col justify-center p-12 border-r border-ink/10">
            <div className="sketch-border-sunny bg-sunny/20 px-8 py-10">
              <p className="text-lg font-bold text-muted uppercase tracking-wider mb-4">The wine was...</p>
              <h2 className="text-6xl font-black text-ink leading-tight">{round.wine.name}</h2>
              <p className="text-4xl font-bold mt-4 text-ink">{round.wine.variety}</p>
              <p className="text-2xl font-semibold mt-3 text-muted">{round.wine.country} · {round.wine.region}</p>
              <p className="text-5xl font-black mt-4" style={{ color: '#722F37' }}>{round.wine.year}</p>
              {round.wine.price > 0 && (
                <p className="text-2xl font-bold mt-2 text-muted">${round.wine.price}</p>
              )}
              {round.wine.flavors && round.wine.flavors.length > 0 && (
                <p className="text-xl font-semibold mt-2 text-muted">
                  {round.wine.flavors.join(' · ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col p-12 overflow-hidden">
            <p className="font-black text-2xl uppercase tracking-wider text-muted mb-6">Round Scores</p>
            <div className="flex flex-col gap-2 overflow-hidden">
              {round.scores.length === 0 && (
                <p className="text-muted text-xl font-semibold">No guesses submitted</p>
              )}
              {round.scores
                .slice()
                .sort((a, b) => b.points - a.points)
                .map((s) => {
                  const player = gameState.players[s.playerId]
                  return (
                    <div key={s.playerId} className="flex items-center sketch-border bg-white overflow-hidden">
                      <div className="w-1.5 self-stretch shrink-0" style={{ backgroundColor: player?.color ?? '#ccc' }} />
                      <div className="flex items-center gap-4 px-4 py-3 flex-1">
                        {player && <PlayerAvatar player={player} size={40} />}
                        <span className="flex-1 font-bold text-2xl text-ink truncate">{player?.name ?? s.playerId}</span>
                        <span className="font-black text-3xl text-ink">+{s.points}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Complete
  if (gameState.phase === 'complete') {
    const winner = gameState.leaderboard[0]
    const winnerPlayer = winner ? gameState.players[winner.playerId] : undefined
    const summary = gameState.summary

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 grid grid-cols-2 min-h-0">
          <div className="flex flex-col p-10 gap-5 overflow-hidden border-r border-ink/10">
            <div className="sketch-border-sunny bg-sunny/30 px-6 py-4 flex items-center gap-4 shrink-0">
              <div className="text-4xl shrink-0">🏆</div>
              {winnerPlayer && <PlayerAvatar player={winnerPlayer} size={64} />}
              <div>
                <h1 className="text-4xl font-black leading-tight">
                  {winner ? `${winner.playerName} wins!` : 'Game Over!'}
                </h1>
                {winner && <p className="text-3xl font-black text-grape">{winner.score} pts</p>}
              </div>
            </div>

            {(gameState.miniGameWinners?.length ?? 0) > 0 && (
              <div className="sketch-border bg-white/80 px-4 py-3 flex-1 min-h-0 overflow-hidden">
                <p className="text-sm font-black uppercase tracking-wider text-muted mb-2">Mini-Game Highlights</p>
                {gameState.miniGameWinners!.map((w, i) => {
                  const names = w.winnerIds.map((id) => gameState.players[id]?.name ?? '—').join(', ')
                  return (
                    <div key={i} className="flex justify-between items-center py-1 border-b last:border-0 border-paper">
                      <span className="font-semibold text-base capitalize">{w.gameType.replace(/_/g, ' ')}</span>
                      <span className="font-black text-base text-ink">{names}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col p-10 gap-4 overflow-hidden">
            {summary ? (
              <>
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  {summary.mostPopular && (
                    <div className="sketch-border-lime bg-white px-3 py-3">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Most Popular</p>
                      <p className="font-black text-sm text-ink leading-tight">{summary.mostPopular.wineName}</p>
                      <p className="text-xs text-muted">{summary.mostPopular.wineVariety}</p>
                      <p className="text-2xl font-black text-lime-700 mt-1">{summary.mostPopular.avgRating.toFixed(1)}<span className="text-sm font-semibold text-muted">/10</span></p>
                    </div>
                  )}
                  {summary.leastLiked && summary.leastLiked.wineName !== summary.mostPopular?.wineName && (
                    <div className="sketch-border-coral bg-white px-3 py-3">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Least Liked</p>
                      <p className="font-black text-sm text-ink leading-tight">{summary.leastLiked.wineName}</p>
                      <p className="text-xs text-muted">{summary.leastLiked.wineVariety}</p>
                      <p className="text-2xl font-black text-coral mt-1">{summary.leastLiked.avgRating.toFixed(1)}<span className="text-sm font-semibold text-muted">/10</span></p>
                    </div>
                  )}
                  {summary.mostContested && (
                    <div className="sketch-border-sky bg-white px-3 py-3">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Most Divisive</p>
                      <p className="font-black text-sm text-ink leading-tight">{summary.mostContested.wineName}</p>
                      <p className="text-xs text-muted">{summary.mostContested.wineVariety}</p>
                      <p className="text-2xl font-black text-sky mt-1">{summary.mostContested.avgRating.toFixed(1)}<span className="text-sm font-semibold text-muted">/10</span></p>
                    </div>
                  )}
                </div>
                <div className="sketch-border bg-white px-5 py-4 flex-1 min-h-0 overflow-hidden">
                  <p className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Wine Ratings</p>
                  {summary.wineRatings.map((wr) => {
                    const stdDev = wr.variance > 0 ? Math.sqrt(wr.variance) : 0
                    return (
                      <div key={wr.roundIndex} className="flex justify-between items-center py-2 border-b last:border-0 border-paper">
                        <span className="font-semibold text-lg">{wr.wineName} ({wr.wineVariety})</span>
                        <span className="font-black text-xl text-grape">
                          {wr.ratedCount > 0 ? (
                            <>
                              {wr.avgRating.toFixed(1)}/10
                              {stdDev > 0 && (
                                <span className="text-sm font-semibold text-muted ml-1">±{stdDev.toFixed(1)}</span>
                              )}
                            </>
                          ) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-3xl font-black text-muted">Game Over!</p>
              </div>
            )}
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} showRanks />
      </div>
    )
  }

  // Mini-game phase
  if (gameState.phase === 'minigame' && gameState.miniGame) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-10">
          <div className="w-full max-w-5xl flex flex-col gap-6">
            <MiniGameDisplay miniGame={gameState.miniGame} players={gameState.players} />
            {gameState.timer && gameState.timer.durationSecs > 0 && (
              <div className="mt-4">
                <CountdownTimer timer={gameState.timer} size="lg" />
              </div>
            )}
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  // Mini-game results phase
  if (gameState.phase === 'minigame_results' && gameState.miniGame) {
    const mg = gameState.miniGame
    const type = mg.config.type
    const miniGameScores = allPlayers
      .map((p) => {
        const pts =
          type === 'wordle' ? (mg.wordleStates?.[p.id]?.points ?? 0) :
          type === 'connections' ? (mg.connStates?.[p.id]?.points ?? 0) :
          type === 'trivia' ? (mg.triviaStates?.[p.id]?.points ?? 0) :
          type === 'fibbage' ? (mg.fibbageStates?.[p.id]?.points ?? 0) :
          type === 'quiplash' ? (mg.quiplashStates?.[p.id]?.points ?? 0) :
          type === 'emoji_decode' ? (mg.emojiStates?.[p.id]?.points ?? 0) :
          0
        return { player: p, pts }
      })
      .sort((a, b) => b.pts - a.pts)

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 grid grid-cols-2 min-h-0">
          <div className="flex flex-col items-center justify-center p-10 border-r border-ink/10 overflow-hidden">
            <div className="w-full max-w-2xl">
              <MiniGameDisplay miniGame={mg} players={gameState.players} resultsMode={true} />
            </div>
          </div>

          <div className="flex flex-col p-10 overflow-hidden">
            <h3 className="text-2xl font-black mb-6 uppercase tracking-wider text-muted">Mini-Game Scores</h3>
            <div className="flex flex-col gap-2 overflow-hidden">
              {miniGameScores.map((s, i) => {
                const rankLabel = i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`
                return (
                  <div key={s.player.id} className="flex items-center sketch-border bg-white overflow-hidden">
                    <div className="w-1.5 self-stretch shrink-0" style={{ backgroundColor: s.player.color ?? '#ccc' }} />
                    <div className="flex items-center gap-4 px-4 py-3 flex-1">
                      <span className="text-2xl w-10 text-center font-black shrink-0 text-muted">{rankLabel}</span>
                      <PlayerAvatar player={s.player} size={40} />
                      <span className="flex-1 font-bold text-2xl text-ink truncate">{s.player.name}</span>
                      <span className="font-black text-3xl text-grape tabular-nums">{s.pts} pts</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <DisplayPlayerBar players={allPlayers} leaderboard={leaderboard} />
      </div>
    )
  }

  return null
}
