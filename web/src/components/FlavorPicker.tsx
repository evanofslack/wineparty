const FLAVORS = [
  'Cherry', 'Plum', 'Blackberry', 'Raspberry', 'Strawberry',
  'Apple', 'Pear', 'Peach', 'Lemon', 'Grapefruit',
  'Oak', 'Vanilla', 'Cedar', 'Toast', 'Smoke',
  'Pepper', 'Leather', 'Earth', 'Mushroom', 'Herbs',
  'Butter', 'Cream', 'Honey', 'Mineral', 'Floral',
]

const FLAVOR_COLORS = [
  'bg-coral/20 border-coral text-coral',
  'bg-sky/20 border-sky text-sky',
  'bg-grape/20 border-grape text-grape',
  'bg-lime/20 border-lime text-lime',
  'bg-sunny/20 border-sunny/70 text-ink',
]

interface Props {
  selected: string[]
  onChange: (flavors: string[]) => void
  max?: number
}

export function FlavorPicker({ selected, onChange, max = 3 }: Props) {
  function toggle(flavor: string) {
    if (selected.includes(flavor)) {
      onChange(selected.filter((f) => f !== flavor))
    } else if (selected.length < max) {
      onChange([...selected, flavor])
    }
  }

  return (
    <div>
      <p className="text-sm font-bold text-muted mb-2">
        Pick up to {max} flavor notes ({selected.length}/{max})
      </p>
      <div className="flex flex-wrap gap-2">
        {FLAVORS.map((flavor, i) => {
          const isSelected = selected.includes(flavor)
          const colorClass = FLAVOR_COLORS[i % FLAVOR_COLORS.length]
          const disabled = !isSelected && selected.length >= max

          return (
            <button
              key={flavor}
              onClick={() => toggle(flavor)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm font-bold border-2 rounded-full transition-all select-none
                ${isSelected ? colorClass + ' scale-105 shadow-sketch' : 'bg-white border-muted/30 text-muted'}
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
              `}
            >
              {flavor}
            </button>
          )
        })}
      </div>
    </div>
  )
}
