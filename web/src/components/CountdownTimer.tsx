import { useEffect, useState } from 'react'

interface Props {
  seconds: number
  onComplete?: () => void
}

export function CountdownTimer({ seconds, onComplete }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.()
      return
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onComplete])

  const pct = (remaining / seconds) * 100
  const color =
    remaining > seconds * 0.5
      ? 'var(--color-lime)'
      : remaining > seconds * 0.25
        ? 'var(--color-sunny)'
        : 'var(--color-coral)'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-4xl font-black tabular-nums"
        style={{ color, fontFamily: 'Nunito, sans-serif' }}
      >
        {remaining}
      </div>
      <div className="w-32 h-3 sketch-border overflow-hidden">
        <div
          className="h-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
