import type { MiniGameState, Player } from '../../types/game'

interface Props {
  miniGame: MiniGameState
  players: Record<string, Player>
}

const COLOR_STYLES: Record<string, string> = {
  yellow: 'bg-sunny/30 border-sunny',
  green: 'bg-lime/30 border-lime',
  blue: 'bg-sky/30 border-sky',
  purple: 'bg-grape/20 border-grape',
}

export function MiniGameDisplay({ miniGame, players }: Props) {
  const playerList = Object.values(players).filter((p) => p.role === 'player')
  const { config } = miniGame

  if (config.type === 'trivia') {
    const questions = config.questions ?? []
    const q = questions[miniGame.currentQuestion]
    const totalAnswered = q
      ? Object.values(miniGame.triviaStates ?? {}).filter(
          (s) => s.answers[miniGame.currentQuestion] !== undefined && s.answers[miniGame.currentQuestion] !== -1
        ).length
      : 0

    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="sketch-border-sky bg-sky/10 px-6 py-6 text-center">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
            Question {miniGame.currentQuestion + 1} of {questions.length}
          </p>
          {q ? (
            <>
              <p className="text-2xl font-black text-ink mb-4">{q.text}</p>
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt, i) => (
                  <div key={i} className="sketch-border bg-white px-4 py-3 text-left font-semibold">
                    <span className="font-black text-grape mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xl font-black text-muted">All questions answered!</p>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-muted">
            <span className="text-grape font-black">{totalAnswered}</span> / {playerList.length} answered
          </p>
        </div>
      </div>
    )
  }

  if (config.type === 'wordle') {
    const wordLen = (config.word ?? '').length
    const maxGuesses = config.maxGuesses ?? 6
    const solved = Object.values(miniGame.wordleStates ?? {}).filter((s) => s.solved).length

    return (
      <div className="flex flex-col items-center gap-6">
        <p className="text-xl font-black text-ink uppercase tracking-widest">Wordle</p>
        <div className="flex gap-1">
          {Array.from({ length: wordLen }, (_, i) => (
            <div key={i} className="w-14 h-14 border-2 border-muted/30 bg-white" />
          ))}
        </div>
        <p className="text-lg font-bold text-muted">
          {wordLen}-letter word · {maxGuesses} guesses
        </p>
        <p className="font-bold text-lg">
          <span className="text-lime font-black">{solved}</span> / {playerList.length} solved
        </p>
      </div>
    )
  }

  if (config.type === 'connections') {
    const groups = config.groups ?? []
    const connStates = miniGame.connStates ?? {}
    const allWords = groups.flatMap((g) => g.words)
    const groupFoundCount = groups.map(
      (g) => Object.values(connStates).filter((s) => s.foundGroups.includes(g.category)).length
    )

    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-xl font-black text-center text-ink">Connections</p>
        {/* Found groups header */}
        {groups.map((g, i) => {
          const count = groupFoundCount[i]
          if (count === 0) return null
          return (
            <div
              key={g.category}
              className={`px-4 py-2 border-2 ${COLOR_STYLES[g.color] ?? COLOR_STYLES.yellow} text-center`}
            >
              <p className="font-black text-sm uppercase">{g.category}</p>
              <p className="text-xs text-muted font-semibold">{count} player{count !== 1 ? 's' : ''} found this</p>
            </div>
          )
        })}
        {/* All 16 words (non-interactive) */}
        <div className="grid grid-cols-4 gap-2">
          {allWords.map((word) => (
            <div
              key={word}
              className="px-2 py-3 border-2 border-muted/30 bg-white font-bold text-sm text-center text-ink"
            >
              {word}
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="font-bold text-muted">
            {Object.values(connStates).length} players participating
          </p>
        </div>
      </div>
    )
  }

  return null
}
