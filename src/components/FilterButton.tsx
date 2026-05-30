import { Funnel } from 'lucide-react'

type FilterButtonProps = {
  activeCount: number
  onClick: () => void
}

export function FilterButton({ activeCount, onClick }: FilterButtonProps) {
  const isActive = activeCount > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-16 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-bold shadow-cellar transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/70 sm:w-auto sm:min-w-36 ${
        isActive
          ? 'border-brass bg-brass text-graphite hover:bg-amber-300'
          : 'border-white/10 bg-white/[0.08] text-ivory hover:border-brass/45 hover:text-brass'
      }`}
    >
      <Funnel size={18} aria-hidden="true" />
      Filtro
      {isActive ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-graphite px-1.5 text-xs text-brass">
          {activeCount}
        </span>
      ) : null}
    </button>
  )
}
