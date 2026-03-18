import { useEffect, useState } from 'react'
import type { TimerState } from '../types/game'

interface Props {
  timer: TimerState
  size?: 'sm' | 'lg'
}

function computeRemaining(timer: TimerState): number {
  let elapsed = timer.elapsedSecs
  if (timer.running && timer.startedAt) {
    elapsed += Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000)
  }
  return Math.max(0, timer.durationSecs - elapsed)
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CountdownTimer({ timer, size = 'lg' }: Props) {
  const [remaining, setRemaining] = useState(() => computeRemaining(timer))

  useEffect(() => {
    setRemaining(computeRemaining(timer))
  }, [timer])

  useEffect(() => {
    if (!timer.running || remaining <= 0) return
    const t = setTimeout(() => setRemaining(computeRemaining(timer)), 1000)
    return () => clearTimeout(t)
  }, [timer, remaining])

  const pct = timer.durationSecs > 0 ? (remaining / timer.durationSecs) * 100 : 0
  const color =
    remaining === 0
      ? 'var(--color-muted)'
      : remaining > timer.durationSecs * 0.5
        ? 'var(--color-lime)'
        : remaining > timer.durationSecs * 0.25
          ? 'var(--color-sunny)'
          : 'var(--color-coral)'

  const textSize = size === 'lg' ? 'text-5xl' : 'text-2xl'
  const barWidth = size === 'lg' ? 'w-48' : 'w-32'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${textSize} font-black tabular-nums`}
        style={{ color, fontFamily: 'Nunito, sans-serif' }}
      >
        {formatTime(remaining)}
      </div>
      {remaining === 0 && (
        <p className="text-sm font-bold text-muted">Time's up!</p>
      )}
      <div className={`${barWidth} h-3 sketch-border overflow-hidden`}>
        <div
          className="h-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
