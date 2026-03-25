import type { MiniGameState, Player } from '../../types/game'

interface Props {
  miniGame: MiniGameState
  players: Record<string, Player>
  resultsMode?: boolean
}

const COLOR_STYLES: Record<string, string> = {
  yellow: 'bg-sunny/30 border-sunny',
  green: 'bg-lime/30 border-lime',
  blue: 'bg-sky/30 border-sky',
  purple: 'bg-grape/20 border-grape',
}


export function MiniGameDisplay({ miniGame, players, resultsMode = false }: Props) {
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

    if (resultsMode) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-xl font-black text-center">Trivia Summary</p>
          {questions.map((qq, qi) => (
            <div key={qi} className="sketch-border bg-white px-4 py-3">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Q{qi + 1} · {qq.points} pts
              </p>
              <p className="font-black text-ink mb-1">{qq.text}</p>
              <p className="text-xs font-semibold text-lime-700 mb-2">✓ {qq.answer}</p>
              <div className="flex flex-wrap gap-1">
                {playerList.map((p) => {
                  const ps = miniGame.triviaStates?.[p.id]
                  const idx = ps?.answers?.[qi] ?? -1
                  const answered = idx !== -1
                  const correct = answered && qq.options[idx]?.toLowerCase().trim() === qq.answer.toLowerCase().trim()
                  return (
                    <span
                      key={p.id}
                      className={`text-xs font-bold px-2 py-0.5 ${correct ? 'bg-lime text-ink' : answered ? 'bg-coral text-white' : 'bg-paper text-muted'}`}
                    >
                      {p.name}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )
    }

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
                {q.options.map((opt, i) => {
                  const isCorrect = opt.toLowerCase().trim() === q.answer.toLowerCase().trim()
                  const highlight = miniGame.answerRevealed && isCorrect
                  return (
                    <div
                      key={i}
                      className={`sketch-border px-4 py-3 text-left font-semibold ${highlight ? 'bg-lime' : 'bg-white'}`}
                    >
                      <span className="font-black text-grape mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                    </div>
                  )
                })}
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
        {miniGame.answerRevealed && q && (
          <div className="flex flex-col gap-1 mt-2">
            {playerList.map((p) => {
              const ps = miniGame.triviaStates?.[p.id]
              const idx = ps?.answers?.[miniGame.currentQuestion] ?? -1
              const answered = idx !== -1
              const correct = answered && q.options[idx]?.toLowerCase().trim() === q.answer.toLowerCase().trim()
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1 text-sm font-semibold ${
                    correct ? 'bg-lime/30' : answered ? 'bg-coral/20' : 'bg-paper'
                  }`}
                >
                  <span className="font-black">{correct ? '✓' : answered ? '✗' : '—'}</span>
                  <span>{p.name}</span>
                  {answered && !correct && (
                    <span className="text-xs text-muted ml-auto">{q.options[idx]}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (config.type === 'wordle') {
    const word = config.word ?? ''
    const wordLen = word.length
    const maxGuesses = config.maxGuesses ?? 6
    const solved = Object.values(miniGame.wordleStates ?? {}).filter((s) => s.solved).length

    return (
      <div className="flex flex-col items-center gap-6">
        <p className="text-xl font-black text-ink uppercase tracking-widest">Wordle</p>
        {resultsMode && (
          <p className="text-3xl font-black text-grape uppercase tracking-widest">{word}</p>
        )}
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

    if (resultsMode) {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="text-xl font-black text-center text-ink">Connections — Results</p>
          {groups.map((g) => {
            const count = Object.values(connStates).filter((s) => s.foundGroups.includes(g.category)).length
            return (
              <div
                key={g.category}
                className={`px-4 py-3 border-2 ${COLOR_STYLES[g.color] ?? COLOR_STYLES.yellow} text-center`}
              >
                <p className="font-black text-sm uppercase tracking-wide">{g.category}</p>
                <p className="text-xs font-semibold">{g.words.join(', ')}</p>
                <p className="text-xs text-muted mt-1">{count} player{count !== 1 ? 's' : ''} found this</p>
              </div>
            )
          })}
        </div>
      )
    }

    const allWords = groups.flatMap((g) => g.words)
    const totalFound = Object.values(connStates).reduce((sum, s) => sum + s.foundGroups.length, 0)

    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-xl font-black text-center text-ink">Connections</p>
        <p className="text-center font-bold text-muted">
          <span className="text-grape font-black">{totalFound}</span> groups found so far
        </p>
        {/* All 16 words (non-interactive, no category names) */}
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
