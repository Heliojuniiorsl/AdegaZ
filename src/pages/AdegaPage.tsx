import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BottleWine, PackageSearch } from 'lucide-react'
import vinhosJson from '../data/vinhos-paodeacucar.json'
import { CategoryChips } from '../components/CategoryChips'
import { EanMatchPanel } from '../components/EanMatchPanel'
import { EanScannerModal } from '../components/EanScannerModal'
import { EmptyState } from '../components/EmptyState'
import { FilterButton } from '../components/FilterButton'
import { FilterModal } from '../components/FilterModal'
import { ResultCounter } from '../components/ResultCounter'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { WineCard } from '../components/WineCard'
import { WineDetails } from '../components/WineDetails'
import { useEanScanner } from '../hooks/useEanScanner'
import { useVoiceSearch } from '../hooks/useVoiceSearch'
import type { Wine } from '../types/wine'
import type { EanResolutionState } from '../utils/eanUtils'
import {
  aplicarVinculosEAN,
  buscarProdutoPorEANComComparacao,
  carregarVinculosEAN,
} from '../utils/eanUtils'
import type { CategoriaVinho, FiltrosAvancados } from '../utils/wineUtils'
import {
  aplicarFiltrosAvancados,
  buscarVinhos,
  filtrarPorCategoria,
  filtrosAvancadosVazios,
  getOpcoesDeFiltro,
  temFiltrosAvancadosAtivos,
} from '../utils/wineUtils'

const RESULT_BATCH_SIZE = 20
const EAN_QUERY_DEBOUNCE_MS = 650

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

function countAdvancedFilters(filters: FiltrosAvancados) {
  return Object.values(filters).reduce((total, values) => total + values.length, 0)
}

function normalizarPossivelEan(value: string) {
  return value.replace(/\D/g, '')
}

function isEanCompleto(value: string) {
  const digits = normalizarPossivelEan(value)
  return (
    value.trim() === digits &&
    (/^\d{8}$/.test(digits) || /^\d{12,14}$/.test(digits))
  )
}

export function AdegaPage() {
  const vinhos = vinhosJson as Wine[]
  const [eanLinks] = useState(() => carregarVinculosEAN())
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoriaVinho>('Todos')
  const [advancedFilters, setAdvancedFilters] = useState<FiltrosAvancados>(() =>
    cloneFilters(filtrosAvancadosVazios),
  )
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH_SIZE)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null)
  const [eanResolution, setEanResolution] = useState<EanResolutionState | null>(null)
  const [notice, setNotice] = useState('')
  const lastResolvedTypedEanRef = useRef('')
  const eanPanelRef = useRef<HTMLDivElement | null>(null)
  const vinhosComVinculos = useMemo(() => aplicarVinculosEAN(vinhos, eanLinks), [eanLinks, vinhos])
  const handleEanResult = useCallback(
    (ean: string, source: 'camera' | 'typed' = 'camera') => {
      setQuery(ean)
      setVisibleCount(RESULT_BATCH_SIZE)
      setEanResolution({ status: 'carregando', ean })
      lastResolvedTypedEanRef.current = ean
      setNotice(source === 'camera' ? `EAN ${ean} lido.` : `Buscando EAN ${ean}.`)
      window.setTimeout(() => setNotice(''), 2600)

      void buscarProdutoPorEANComComparacao(ean, vinhosComVinculos, eanLinks).then((resultado) => {
        setEanResolution(resultado)

        if (resultado.status === 'local') {
          setSelectedWine(resultado.vinho)
        }
      })
    },
    [eanLinks, vinhosComVinculos],
  )
  const {
    videoRef,
    isScannerOpen,
    isScanning,
    scannerError,
    isCameraSupported,
    cameraLabel,
    startScanner,
    stopScanner,
  } = useEanScanner({
    onResult: handleEanResult,
  })
  const handleVoiceResult = useCallback((transcript: string) => {
    setQuery(transcript)
    setVisibleCount(RESULT_BATCH_SIZE)
  }, [])
  const {
    isListening,
    voiceError,
    isVoiceSupported,
    startListening,
    clearVoiceError,
  } = useVoiceSearch({
    onResult: handleVoiceResult,
  })
  const filterOptions = useMemo(() => getOpcoesDeFiltro(vinhosComVinculos), [vinhosComVinculos])
  const busca = useMemo(() => buscarVinhos(vinhosComVinculos, query), [query, vinhosComVinculos])
  const resultados = useMemo(() => {
    const porCategoria = filtrarPorCategoria(busca.vinhos, selectedCategory)
    return aplicarFiltrosAvancados(porCategoria, advancedFilters)
  }, [advancedFilters, busca.vinhos, selectedCategory])
  const resultadosVisiveis = resultados.slice(0, visibleCount)
  const advancedFilterCount = countAdvancedFilters(advancedFilters)
  const hasAdvancedFilters = temFiltrosAvancadosAtivos(advancedFilters)
  const hasAnyFilter = selectedCategory !== 'Todos' || hasAdvancedFilters
  const isSearching = query.trim().length > 0
  const hasMoreResults = visibleCount < resultados.length
  const emptyState =
    busca.estado === 'codigo-incompleto'
      ? {
          title: 'Código incompleto.',
          description: 'Digite o código completo do produto.',
        }
      : busca.estado === 'codigo-sem-resultados'
        ? {
            title: 'Código não encontrado.',
            description: 'Nenhum vinho encontrado para esse código ou EAN.',
          }
        : {
            title: 'Nenhum vinho encontrado.',
            description: 'Tente remover algum filtro ou buscar por outro nome.',
          }

  useEffect(() => {
    const ean = normalizarPossivelEan(query)

    if (!isEanCompleto(query)) {
      lastResolvedTypedEanRef.current = ''
      return undefined
    }

    if (lastResolvedTypedEanRef.current === ean) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      handleEanResult(ean, 'typed')
    }, EAN_QUERY_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [handleEanResult, query])

  useEffect(() => {
    if (!eanResolution) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      eanPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [eanResolution])

  function resetVisibleResults() {
    setVisibleCount(RESULT_BATCH_SIZE)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!isEanCompleto(value)) {
      setEanResolution(null)
    }
    clearVoiceError()
    resetVisibleResults()
  }

  function handleCategoryChange(categoria: CategoriaVinho) {
    setSelectedCategory(categoria)
    resetVisibleResults()
  }

  function handleApplyFilters(filters: FiltrosAvancados) {
    setAdvancedFilters(cloneFilters(filters))
    setIsFilterOpen(false)
    resetVisibleResults()
  }

  function handleClearFilters() {
    setAdvancedFilters(cloneFilters(filtrosAvancadosVazios))
    setIsFilterOpen(false)
    resetVisibleResults()
  }

  if (selectedWine) {
    return (
      <div className="min-h-screen">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-ivory">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brass/30 bg-brass/10 text-brass">
              <BottleWine size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Adega Inteligente</p>
              <p className="text-xs text-stone-400">Consulta premium de vinhos</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              to="/despensa"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-stone-200 transition duration-200 hover:border-brass/45 hover:text-brass"
            >
              <PackageSearch size={17} aria-hidden="true" />
              Despensa
            </Link>
          </div>
        </header>
        <WineDetails wine={selectedWine} onBack={() => setSelectedWine(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brass/30 bg-brass/10 text-brass shadow-glow">
            <BottleWine size={24} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ivory">Adega Inteligente</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            to="/despensa"
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-stone-200 transition duration-200 hover:border-brass/45 hover:text-brass"
          >
            <PackageSearch size={17} aria-hidden="true" />
            Despensa
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-14 w-full max-w-7xl min-w-0">
        <section className="mx-auto w-full max-w-4xl min-w-0 text-center">
          <p className="mb-4 inline-flex rounded-full border border-brass/25 bg-brass/10 px-3 py-1 text-xs font-semibold uppercase text-brass">
            Catálogo Pão de Açúcar
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-ivory sm:text-5xl">
            Adega Inteligente
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-300">
            Pesquise vinhos por nome ou código do produto.
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-4xl min-w-0 flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchBar
                value={query}
                onChange={handleQueryChange}
                onCameraClick={startScanner}
                onVoiceClick={startListening}
                isListening={isListening}
                isVoiceSupported={isVoiceSupported}
                voiceError={voiceError}
              />
            </div>
            <FilterButton activeCount={advancedFilterCount} onClick={() => setIsFilterOpen(true)} />
          </div>

          <div className="mt-4">
            <CategoryChips selected={selectedCategory} onSelect={handleCategoryChange} />
          </div>
        </section>

        {notice ? (
          <div className="fixed right-4 top-4 z-20 rounded-md border border-brass/35 bg-graphite px-4 py-3 text-sm font-medium text-ivory shadow-cellar">
            {notice}
          </div>
        ) : null}

        <section className="mt-12 min-w-0">
          {eanResolution ? (
            <div ref={eanPanelRef} className="min-w-0 scroll-mt-6">
              <EanMatchPanel
                result={eanResolution}
                onSelectWine={(wine) => {
                  setSelectedWine(wine)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onClear={() => setEanResolution(null)}
              />
            </div>
          ) : null}

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ivory">
                {isSearching || hasAnyFilter ? 'Resultados da busca' : 'Destaques da adega'}
              </h2>
              <ResultCounter
                total={resultados.length}
                visible={Math.min(visibleCount, resultados.length)}
                hasFilters={hasAnyFilter}
                isSearching={isSearching}
                state={busca.estado}
              />
            </div>
          </div>

          {resultadosVisiveis.length > 0 ? (
            <>
              <div className="grid min-w-0 animate-fade-in grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {resultadosVisiveis.map((wine, index) => (
                  <WineCard
                    key={`${wine.codigo_produto ?? 'vinho'}-${index}`}
                    wine={wine}
                    onSelect={() => {
                      setSelectedWine(wine)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                ))}
              </div>

              {hasMoreResults ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + RESULT_BATCH_SIZE)}
                    className="inline-flex min-h-12 items-center justify-center rounded-md border border-brass/40 bg-white/[0.06] px-6 text-sm font-bold text-brass transition duration-200 hover:bg-brass hover:text-graphite focus:outline-none focus:ring-2 focus:ring-brass/70"
                  >
                    Mostrar mais
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title={emptyState.title}
              description={emptyState.description}
              variant="wine"
            />
          )}
        </section>
      </main>

      {isFilterOpen ? (
        <FilterModal
          filters={advancedFilters}
          options={filterOptions}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          onClose={() => setIsFilterOpen(false)}
        />
      ) : null}

      {isScannerOpen ? (
        <EanScannerModal
          videoRef={videoRef}
          isScanning={isScanning}
          error={scannerError}
          isSupported={isCameraSupported}
          cameraLabel={cameraLabel}
          onClose={stopScanner}
        />
      ) : null}
    </div>
  )
}

export default AdegaPage
