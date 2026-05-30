import type { CategoriaVinho } from '../utils/wineUtils'
import { CATEGORIAS_RAPIDAS } from '../utils/wineUtils'

type CategoryChipsProps = {
  selected: CategoriaVinho
  onSelect: (categoria: CategoriaVinho) => void
}

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {CATEGORIAS_RAPIDAS.map((categoria) => {
        const active = selected === categoria

        return (
          <button
            type="button"
            key={categoria}
            onClick={() => onSelect(categoria)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 ${
              active
                ? 'border-brass bg-brass text-graphite shadow-glow'
                : 'border-white/10 bg-white/[0.055] text-stone-300 hover:border-brass/45 hover:text-brass'
            }`}
          >
            {categoria}
          </button>
        )
      })}
    </div>
  )
}
