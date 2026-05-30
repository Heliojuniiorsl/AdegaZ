import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FilterSection } from './FilterSection'
import type {
  CategoriaFiltro,
  FiltrosAvancados,
  HarmonizacaoFiltro,
  OpcoesDeFiltro,
  PaisFiltro,
  TeorAlcoolicoFiltro,
  UvaFiltro,
} from '../utils/wineUtils'
import {
  CORES_FILTRO,
  HARMONIZACOES_FILTRO,
  PAISES_FILTRO,
  TEORES_FILTRO,
  UVAS_FILTRO,
  filtrosAvancadosVazios,
  normalizarTexto,
} from '../utils/wineUtils'

type FilterModalProps = {
  filters: FiltrosAvancados
  options: OpcoesDeFiltro
  onApply: (filters: FiltrosAvancados) => void
  onClear: () => void
  onClose: () => void
}

type FilterKey = keyof FiltrosAvancados

function cloneFilters(filters: FiltrosAvancados): FiltrosAvancados {
  return {
    cores: [...filters.cores],
    uvas: [...filters.uvas],
    paises: [...filters.paises],
    marcas: [...filters.marcas],
    teores: [...filters.teores],
    harmonizacoes: [...filters.harmonizacoes],
  }
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function OptionGrid<T extends string>({
  values,
  selected,
  onToggle,
}: {
  values: T[]
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const active = selected.includes(value)

        return (
          <button
            type="button"
            key={value}
            onClick={() => onToggle(value)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 ${
              active
                ? 'border-brass bg-brass text-graphite'
                : 'border-white/10 bg-white/[0.055] text-stone-300 hover:border-brass/45 hover:text-brass'
            }`}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

export function FilterModal({
  filters,
  options,
  onApply,
  onClear,
  onClose,
}: FilterModalProps) {
  const [draft, setDraft] = useState<FiltrosAvancados>(() => cloneFilters(filters))
  const [brandSearch, setBrandSearch] = useState('')
  const marcasVisiveis = useMemo(() => {
    const termo = normalizarTexto(brandSearch)
    const marcasFiltradas = termo
      ? options.marcas.filter((marca) => normalizarTexto(marca).includes(termo))
      : options.marcas

    return marcasFiltradas.slice(0, 80)
  }, [brandSearch, options.marcas])

  function toggle<K extends FilterKey>(key: K, value: FiltrosAvancados[K][number]) {
    setDraft((current) => ({
      ...current,
      [key]: toggleValue(current[key], value),
    }))
  }

  function clearDraft() {
    setDraft(cloneFilters(filtrosAvancadosVazios))
    onClear()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/65 px-3 py-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-4xl animate-fade-in flex-col overflow-hidden rounded-lg border border-white/10 bg-[#151217] shadow-cellar">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-ivory">Filtros avançados</h2>
            <p className="mt-1 text-sm text-stone-400">
              Combine busca, categorias e filtros para refinar a adega.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-stone-300 transition duration-200 hover:border-brass/45 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
            aria-label="Fechar filtros"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <FilterSection title="Cor do vinho">
            <OptionGrid<CategoriaFiltro>
              values={CORES_FILTRO}
              selected={draft.cores}
              onToggle={(value) => toggle('cores', value)}
            />
          </FilterSection>

          <FilterSection title="Tipo de uva">
            <OptionGrid<UvaFiltro>
              values={UVAS_FILTRO}
              selected={draft.uvas}
              onToggle={(value) => toggle('uvas', value)}
            />
          </FilterSection>

          <FilterSection title="País de origem">
            <OptionGrid<PaisFiltro>
              values={PAISES_FILTRO}
              selected={draft.paises}
              onToggle={(value) => toggle('paises', value)}
            />
          </FilterSection>

          <FilterSection title="Marca">
            <label className="mb-3 flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm text-stone-300 focus-within:border-brass/60">
              <Search size={16} className="text-brass" aria-hidden="true" />
              <span className="sr-only">Buscar marca</span>
              <input
                value={brandSearch}
                onChange={(event) => setBrandSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-500"
                placeholder="Buscar marca..."
              />
            </label>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.035] p-3">
              {marcasVisiveis.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {marcasVisiveis.map((marca) => {
                    const active = draft.marcas.includes(marca)

                    return (
                      <button
                        type="button"
                        key={marca}
                        onClick={() => toggle('marcas', marca)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 ${
                          active
                            ? 'border-brass bg-brass text-graphite'
                            : 'border-white/10 bg-white/[0.055] text-stone-300 hover:border-brass/45 hover:text-brass'
                        }`}
                      >
                        {marca}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-stone-400">Nenhuma marca encontrada.</p>
              )}
            </div>
          </FilterSection>

          <FilterSection title="Teor alcoólico">
            <OptionGrid<TeorAlcoolicoFiltro>
              values={TEORES_FILTRO}
              selected={draft.teores}
              onToggle={(value) => toggle('teores', value)}
            />
          </FilterSection>

          <FilterSection title="Harmonização">
            <OptionGrid<HarmonizacaoFiltro>
              values={HARMONIZACOES_FILTRO}
              selected={draft.harmonizacoes}
              onToggle={(value) => toggle('harmonizacoes', value)}
            />
          </FilterSection>
        </div>

        <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-white/10 bg-[#151217]/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={clearDraft}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-5 text-sm font-bold text-ivory transition duration-200 hover:border-brass/45 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
          >
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-brass px-5 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-brass/70"
          >
            Aplicar filtros
          </button>
        </footer>
      </div>
    </div>
  )
}
