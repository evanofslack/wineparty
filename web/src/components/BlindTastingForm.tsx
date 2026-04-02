import { useState, useMemo, FormEvent } from 'react'
import { FlavorPicker } from './FlavorPicker'
import type { GuessPayload } from '../types/game'

const VARIETIES = [
  // Reds — 3 real + 2 decoy
  'Cabernet Sauvignon', 'Merlot', 'Malbec', 'Pinot Noir', 'Syrah',
  // Whites — 3 real + 2 decoy
  'Chardonnay', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Viognier',
]

const COUNTRIES = [
  'France', 'USA', 'Italy', 'New Zealand', 'Argentina', 'South Africa',
  'Australia', 'Spain', 'Chile', 'Germany',
]

const REGIONS = [
  'Bordeaux', 'Columbia', 'Veneto', 'Marlborough', 'La Rioja', 'Stellenbosch', 'Sonoma', 'Barossa', 'Napa', 'Willamette',
]

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed >>> 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 13), 0x9e3779b9) | 0) >>> 0
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

interface Props {
  onSubmit: (guess: GuessPayload) => void
  submitted: boolean
  yearMin: number
  yearMax: number
  priceMin: number
  priceMax: number
  seed?: number
}

export function BlindTastingForm({ onSubmit, submitted, yearMin, yearMax, priceMin, priceMax, seed }: Props) {
  const [variety, setVariety] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [year, setYear] = useState<number>(Math.round((yearMin + yearMax) / 2))
  const [price, setPrice] = useState<number>(Math.round((priceMin + priceMax) / 2))
  const [flavors, setFlavors] = useState<string[]>([])
  const [rating, setRating] = useState<number>(5)

  const varieties = useMemo(() => seed ? seededShuffle(VARIETIES, seed) : VARIETIES, [seed])
  const countries = useMemo(() => seed ? seededShuffle(COUNTRIES, seed + 1) : COUNTRIES, [seed])
  const regions = useMemo(() => seed ? seededShuffle(REGIONS, seed + 2) : REGIONS, [seed])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!variety || !country || !region || !year) return
    onSubmit({ variety, country, region, year, price, flavors, rating })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-6xl">🍷</div>
        <p className="text-2xl font-black text-grape">Guess submitted!</p>
        <p className="text-muted font-semibold text-center">
          Waiting for the host to close guessing...
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Grape Variety</label>
        <select
          className="sketch-border-grape bg-white px-3 py-3 font-semibold text-ink w-full"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          required
        >
          <option value="">Select variety...</option>
          {varieties.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Country</label>
        <select
          className="sketch-border-sky bg-white px-3 py-3 font-semibold text-ink w-full"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
        >
          <option value="">Select country...</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Region</label>
        <select
          className="sketch-border-lime bg-white px-3 py-3 font-semibold text-ink w-full"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          required
        >
          <option value="">Select region...</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="sketch-border-sunny bg-sunny/10 px-3 py-3 rounded flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Vintage Year: {year}</label>
        <input
          type="range"
          min={yearMin}
          max={yearMax}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full accent-sunny range-lg"
        />
        <div className="flex justify-between text-xs text-muted font-semibold">
          <span>{yearMin}</span>
          <span className="font-black text-sunny text-base">{year}</span>
          <span>{yearMax}</span>
        </div>
      </div>

      <div className="sketch-border-lime bg-lime/10 px-3 py-3 rounded flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Price Guess: ${price}</label>
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          step={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full accent-lime range-lg"
        />
        <div className="flex justify-between text-xs text-muted font-semibold">
          <span>${priceMin}</span>
          <span className="font-black text-lime text-base">${price}</span>
          <span>${priceMax}</span>
        </div>
      </div>

      <FlavorPicker selected={flavors} onChange={setFlavors} seed={seed} />

      <div className="sketch-border-coral bg-coral/10 px-3 py-3 rounded flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Your Rating: {rating}/10</label>
        <input
          type="range"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full accent-coral range-lg"
        />
        <div className="flex justify-between text-xs text-muted font-semibold">
          <span>1</span>
          <span className="font-black text-coral text-base">{rating}</span>
          <span>10</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!variety || !country || !region}
        className="btn-sketch w-full text-lg mt-2 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        style={{ backgroundColor: variety && country && region ? 'var(--color-grape)' : '#9ca3af' }}
      >
        Submit Guess 🍇
      </button>
    </form>
  )
}
