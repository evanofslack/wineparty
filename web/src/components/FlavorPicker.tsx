import { useMemo } from 'react'

const FLAVORS = [
  // From actual wines
  "Cherry",
  "Plum",
  "Blackberry",
  "Blackcurrant",
  "Cranberry",
  "Currant",
  "Apple",
  "Pear",
  "Grapefruit",
  "Citrus",
  "Passionfruit",
  "Gooseberry",
  "Oak",
  "Tobacco",
  "Earth",
  "Herbs",
  "Violet",
  "White Flowers",
  "Almond",
  "Spice",
  // Decoys
  "Raspberry",
  "Vanilla",
  "Pepper",
  "Leather",
  "Honey",
  "Peach",
  "Apricot",
];

export const FLAVOR_COLORS = [
  "bg-coral/20 border-coral text-coral",
  "bg-sky/20 border-sky text-sky",
  "bg-grape/20 border-grape text-grape",
  "bg-lime/20 border-lime text-lime",
  "bg-sunny/20 border-sunny/70 text-ink",
];

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
  selected: string[];
  onChange: (flavors: string[]) => void;
  max?: number;
  seed?: number;
}

export function FlavorPicker({ selected, onChange, max = 3, seed }: Props) {
  const flavors = useMemo(() => seed ? seededShuffle(FLAVORS, seed + 3) : FLAVORS, [seed])

  function toggle(flavor: string) {
    if (selected.includes(flavor)) {
      onChange(selected.filter((f) => f !== flavor));
    } else if (selected.length < max) {
      onChange([...selected, flavor]);
    }
  }

  return (
    <div>
      <p className="text-sm font-bold text-muted mb-2">
        Pick up to {max} flavor notes ({selected.length}/{max})
      </p>
      <div className="flex flex-wrap gap-2">
        {flavors.map((flavor, i) => {
          const isSelected = selected.includes(flavor);
          const colorClass = FLAVOR_COLORS[i % FLAVOR_COLORS.length];
          const disabled = !isSelected && selected.length >= max;

          return (
            <button
              type="button"
              key={flavor}
              onClick={() => toggle(flavor)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm font-bold border-2 rounded-full transition-all select-none
                ${isSelected ? colorClass + " scale-105 shadow-sketch" : "bg-white border-muted/30 text-muted"}
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
              `}
            >
              {flavor}
            </button>
          );
        })}
      </div>
    </div>
  );
}
