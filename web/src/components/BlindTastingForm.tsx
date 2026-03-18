import { useState, FormEvent } from 'react'
import { FlavorPicker } from './FlavorPicker'
import type { GuessPayload } from '../types/game'

const VARIETIES = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah/Shiraz', 'Zinfandel',
  'Malbec', 'Grenache', 'Sangiovese', 'Nebbiolo', 'Tempranillo',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Gewürztraminer',
  'Viognier', 'Chenin Blanc', 'Albariño', 'Grenache Rosé', 'Other',
]

const COUNTRIES = [
  'France', 'USA', 'Italy', 'Spain', 'Argentina',
  'Australia', 'New Zealand', 'Germany', 'Portugal', 'Austria', 'Chile', 'Other',
]

const REGIONS = [
  'Napa Valley', 'Sonoma', 'Willamette Valley', 'Walla Walla',
  'Bordeaux', 'Burgundy', 'Rhône Valley', 'Champagne', 'Alsace', 'Loire Valley',
  'Tuscany', 'Piedmont', 'Rioja', 'Priorat',
  'Mendoza', 'Marlborough', 'Barossa Valley', 'Provence',
  'Other',
]

interface Props {
  onSubmit: (guess: GuessPayload) => void
  submitted: boolean
}

const currentYear = new Date().getFullYear()

export function BlindTastingForm({ onSubmit, submitted }: Props) {
  const [variety, setVariety] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [year, setYear] = useState<number>(currentYear - 3)
  const [flavors, setFlavors] = useState<string[]>([])
  const [rating, setRating] = useState<number>(5)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!variety || !country || !region || !year) return
    onSubmit({ variety, country, region, year, flavors, rating })
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
          {VARIETIES.map((v) => (
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
          {COUNTRIES.map((c) => (
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
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="sketch-border-sunny bg-sunny/10 px-3 py-3 rounded flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Vintage Year: {year}</label>
        <input
          type="range"
          min={currentYear - 20}
          max={currentYear}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full accent-sunny"
        />
        <div className="flex justify-between text-xs text-muted font-semibold">
          <span>{currentYear - 20}</span>
          <span className="font-black text-sunny text-base">{year}</span>
          <span>{currentYear}</span>
        </div>
      </div>

      <FlavorPicker selected={flavors} onChange={setFlavors} />

      <div className="sketch-border-coral bg-coral/10 px-3 py-3 rounded flex flex-col gap-1.5">
        <label className="font-bold text-sm text-ink">Your Rating: {rating}/10</label>
        <input
          type="range"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full accent-coral"
        />
        <div className="flex justify-between text-xs text-muted font-semibold">
          <span>1</span>
          <span className="font-black text-coral text-base">{rating}</span>
          <span>10</span>
        </div>
      </div>

      <button
        type="submit"
        className="btn-sketch bg-grape text-white w-full text-lg mt-2"
        style={{ backgroundColor: 'var(--color-grape)' }}
      >
        Submit Guess 🍇
      </button>
    </form>
  )
}
