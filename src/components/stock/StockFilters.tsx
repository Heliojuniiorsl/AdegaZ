import { Camera, Funnel, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { StockFiltersState } from '../../types/stock'
import { VoiceSearchButton } from '../VoiceSearchButton'

type StockFiltersProps = {
  filters: StockFiltersState
  onChange: (filters: StockFiltersState) => void
  onCameraClick: () => void
  onVoiceClick: () => void
  isListening: boolean
  isVoiceSupported: boolean
  voiceError: string
}

type FilterDraft = Pick<StockFiltersState, 'tipo' | 'local'>

const tipoOptions: Array<{ label: string; value: StockFiltersState['tipo'] }> = [
  { label: 'Todos os tipos', value: 'todos' },
  { label: 'Tinto', value: 'tinto' },
  { label: 'Branco', value: 'branco' },
  { label: 'Espumante', value: 'espumante' },
  { label: 'Rosé', value: 'rose' },
]

const localOptions: Array<{ label: string; value: StockFiltersState['local'] }> = [
  { label: 'Todos os locais', value: 'todos' },
  { label: 'Depósito', value: 'deposito' },
  { label: 'Área de venda', value: 'area-venda' },
  { label: 'Sem local definido', value: 'sem-local' },
]

function getDraft(filters: StockFiltersState): FilterDraft {
  return {
    tipo: filters.tipo,
    local: filters.local,
  }
}

function countActiveFilters(filters: StockFiltersState) {
  return Number(filters.tipo !== 'todos') + Number(filters.local !== 'todos')
}

function FilterGroup<T extends keyof FilterDraft>({
  title,
  field,
  options,
  draft,
  onChange,
}: {
  title: string
  field: T
  options: Array<{ label: string; value: FilterDraft[T] }>
  draft: FilterDraft
  onChange: (draft: FilterDraft) => void
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-ivory">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = draft[field] === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...draft, [field]: option.value })}
              className={`min-h-11 rounded-md border px-3 text-left text-sm font-bold transition duration-200 ${
                isActive
                  ? 'border-brass bg-brass text-graphite'
                  : 'border-white/10 bg-white/[0.055] text-stone-200 hover:border-brass/40 hover:text-brass'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function StockFilters({
  filters,
  onChange,
  onCameraClick,
  onVoiceClick,
  isListening,
  isVoiceSupported,
  voiceError,
}: StockFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<FilterDraft>(() => getDraft(filters))
  const activeCount = countActiveFilters(filters)

  function openModal() {
    setDraft(getDraft(filters))
    setIsOpen(true)
  }

  function applyFilters() {
    onChange({ ...filters, ...draft })
    setIsOpen(false)
  }

  function clearFilters() {
    const cleanDraft: FilterDraft = {
      tipo: 'todos',
      local: 'todos',
    }

    setDraft(cleanDraft)
    onChange({ ...filters, ...cleanDraft })
    setIsOpen(false)
  }

  return (
    <>
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-3 shadow-cellar sm:p-4">
        <div className="flex items-stretch gap-2 sm:gap-3">
          <div className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-graphite/70 px-2 transition duration-200 focus-within:border-brass/60 focus-within:ring-2 focus-within:ring-brass/20 sm:px-3">
            <Search size={19} className="shrink-0 text-brass" aria-hidden="true" />
            <input
              value={filters.query}
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ivory outline-none placeholder:text-stone-500"
              placeholder="Buscar vinho..."
              aria-label="Buscar vinho por nome, código ou EAN"
            />
            <VoiceSearchButton
              isListening={isListening}
              isSupported={isVoiceSupported}
              onClick={onVoiceClick}
            />
            <button
              type="button"
              onClick={onCameraClick}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-graphite/70 text-stone-200 transition duration-200 hover:border-brass/50 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
              aria-label="Abrir leitor de código de barras"
              title="Leitor de código de barras"
            >
              <Camera size={20} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={openModal}
            aria-label="Filtro"
            title="Filtro"
            className={`inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/70 sm:min-w-36 sm:px-5 ${
              activeCount > 0
                ? 'border-brass bg-brass text-graphite hover:bg-amber-300'
                : 'border-white/10 bg-white/[0.08] text-ivory hover:border-brass/45 hover:text-brass'
            }`}
          >
            <Funnel size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Filtro</span>
            {activeCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-graphite px-1.5 text-xs text-brass">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        {isListening || voiceError ? (
          <p className={`mt-2 text-sm ${voiceError ? 'text-amber-200' : 'text-stone-300'}`}>
            {voiceError || 'Ouvindo...'}
          </p>
        ) : null}
      </section>

      {isOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-cellar shadow-cellar">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-cellar/95 p-5 backdrop-blur">
              <div>
                <h2 className="text-xl font-semibold text-ivory">Filtros do estoque</h2>
                <p className="mt-1 text-sm text-stone-400">Refine por tipo e local.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
                aria-label="Fechar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-6 p-5">
              <FilterGroup
                title="Tipo"
                field="tipo"
                options={tipoOptions}
                draft={draft}
                onChange={setDraft}
              />
              <FilterGroup
                title="Local do estoque"
                field="local"
                options={localOptions}
                draft={draft}
                onChange={setDraft}
              />
            </div>

            <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/10 bg-cellar/95 p-5 backdrop-blur sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-5 text-sm font-bold text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brass px-5 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300"
              >
                Aplicar filtros
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}
