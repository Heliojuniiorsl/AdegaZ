import { Camera, Search, Wine, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EanScannerModal } from '../EanScannerModal'
import { VoiceSearchButton } from '../VoiceSearchButton'
import { useEanScanner } from '../../hooks/useEanScanner'
import { useVoiceSearch } from '../../hooks/useVoiceSearch'
import type { StockLocation } from '../../types/stock'
import type { Wine as WineType } from '../../types/wine'
import {
  aplicarVinculosEAN,
  buscarProdutoPorEANComComparacao,
  carregarVinculosEAN,
  normalizarEAN,
} from '../../utils/eanUtils'
import { buscarVinhos, getCampoSeguro, normalizarTexto } from '../../utils/wineUtils'

export type AddWineToStockData = {
  wine?: WineType
  codigo: string
  nome: string
  quantidade: number
  localEstoque: StockLocation | ''
}

type StockAddWineModalProps = {
  wines: WineType[]
  existingCodes: string[]
  onClose: () => void
  onConfirm: (data: AddWineToStockData) => void
}

const inputClass =
  'min-h-11 w-full rounded-md border border-white/10 bg-graphite/80 px-3 text-sm text-ivory outline-none transition duration-200 placeholder:text-stone-500 focus:border-brass/60 focus:ring-2 focus:ring-brass/20'
const EAN_QUERY_DEBOUNCE_MS = 650
const MANUAL_CODE_DEBOUNCE_MS = 450

function isEanCompleto(value: string) {
  const digits = normalizarEAN(value)

  return (
    value.trim() === digits &&
    (/^\d{8}$/.test(digits) || /^\d{12,14}$/.test(digits))
  )
}

function getWineCode(wine: WineType) {
  return getCampoSeguro(wine.codigo_produto, { maxLength: 80 }) ?? ''
}

function getWineIdentifiers(wine: WineType) {
  return [
    wine.codigo_produto,
    wine.ean,
    wine.gtin,
    wine.codigo_ean,
    wine.codigo_barras,
    wine.codigo_de_barras,
  ]
    .map((value) => getCampoSeguro(value, { maxLength: 80 }))
    .filter((value): value is string => Boolean(value))
}

function normalizarCodigoComparacao(value: string) {
  return normalizarTexto(value).replace(/\s+/g, '')
}

function codigoIgual(input: string, candidate: string) {
  const inputText = normalizarCodigoComparacao(input)
  const candidateText = normalizarCodigoComparacao(candidate)
  const inputDigits = normalizarEAN(input)
  const candidateDigits = normalizarEAN(candidate)

  return (
    Boolean(inputText && candidateText && inputText === candidateText) ||
    Boolean(inputDigits && candidateDigits && inputDigits === candidateDigits)
  )
}

function findWineByExactCode(value: string, wines: WineType[]) {
  return wines.find((wine) =>
    getWineIdentifiers(wine).some((identifier) => codigoIgual(value, identifier)),
  )
}

function getWineName(wine: WineType) {
  return getCampoSeguro(wine.nome_produto, { maxLength: 180 }) ?? 'Vinho sem nome'
}

function getWineImage(wine?: WineType) {
  return getCampoSeguro(wine?.imagem_principal, { maxLength: 600 })
}

function getWineSuggestionKey(wine: WineType) {
  return getWineCode(wine) || normalizarTexto(getWineName(wine))
}

function pontuarSugestaoPorNome(wine: WineType, query: string) {
  const normalizedQuery = normalizarTexto(query)
  const normalizedName = normalizarTexto(getWineName(wine))
  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 3)

  if (tokens.length === 0) {
    return 0
  }

  const matchingTokens = tokens.filter((token) => normalizedName.includes(token)).length

  if (matchingTokens === 0) {
    return 0
  }

  return (
    matchingTokens * 10 +
    (normalizedName.includes(normalizedQuery) ? 20 : 0) +
    (normalizedName.startsWith(tokens[0]) ? 4 : 0)
  )
}

function WineSuggestionButton({
  wine,
  label,
  alreadyInStock,
  onClick,
}: {
  wine: WineType
  label: string
  alreadyInStock: boolean
  onClick: () => void
}) {
  const wineName = getWineName(wine)
  const wineCode = getWineCode(wine)
  const image = getWineImage(wine)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-2 text-left transition duration-200 hover:border-brass/45 hover:bg-white/[0.07]"
    >
      <span className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white p-1.5">
        {image ? (
          <img src={image} alt={wineName} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <Wine size={20} className="text-brass/75" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-brass">{label}</span>
          {alreadyInStock ? (
            <span className="rounded-full border border-brass/30 bg-brass/10 px-2 py-0.5 text-[10px] font-bold text-brass">
              Ja no estoque
            </span>
          ) : null}
        </span>
        <span className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-ivory">
          {wineName}
        </span>
        <span className="mt-1 block text-xs font-bold text-brass">{wineCode}</span>
      </span>
    </button>
  )
}

export function StockAddWineModal({
  wines,
  existingCodes,
  onClose,
  onConfirm,
}: StockAddWineModalProps) {
  const lastResolvedTypedEanRef = useRef('')
  const lastResolvedManualCodeRef = useRef('')
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [selectedWine, setSelectedWine] = useState<WineType | undefined>()
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [localEstoque, setLocalEstoque] = useState<StockLocation | ''>('')
  const [searchMessage, setSearchMessage] = useState('')
  const [formError, setFormError] = useState('')
  const eanLinks = useMemo(() => carregarVinculosEAN(), [])
  const winesWithLinks = useMemo(() => aplicarVinculosEAN(wines, eanLinks), [eanLinks, wines])
  const existingCodeSet = useMemo(() => new Set(existingCodes), [existingCodes])
  const trimmedCodigo = codigo.trim()
  const trimmedNome = nome.trim()
  const canSubmit = Boolean(trimmedCodigo && trimmedNome)

  const catalogResults = useMemo(() => {
    const normalizedQuery = normalizarTexto(catalogQuery)

    return winesWithLinks
      .filter((wine) => {
        const wineCode = getWineCode(wine)

        if (!wineCode) {
          return false
        }

        if (!normalizedQuery) {
          return true
        }

        return (
          normalizarTexto(getWineName(wine)).includes(normalizedQuery) ||
          normalizarTexto(wineCode).includes(normalizedQuery)
        )
      })
      .slice(0, 30)
  }, [catalogQuery, winesWithLinks])

  const nameSuggestions = useMemo(() => {
    const normalizedName = normalizarTexto(trimmedNome)

    if (normalizedName.length < 3) {
      return []
    }

    if (selectedWine && normalizarTexto(getWineName(selectedWine)) === normalizedName) {
      return []
    }

    const strongResults = buscarVinhos(winesWithLinks, trimmedNome).vinhos.filter((wine) =>
      Boolean(getWineCode(wine)),
    )
    const seen = new Set<string>()
    const suggestions: WineType[] = []

    strongResults.forEach((wine) => {
      const key = getWineSuggestionKey(wine)

      if (!seen.has(key)) {
        seen.add(key)
        suggestions.push(wine)
      }
    })

    if (suggestions.length < 2) {
      winesWithLinks
        .map((wine) => ({
          wine,
          score: pontuarSugestaoPorNome(wine, trimmedNome),
        }))
        .filter(({ wine, score }) => score > 0 && Boolean(getWineCode(wine)))
        .sort((a, b) => b.score - a.score)
        .forEach(({ wine }) => {
          const key = getWineSuggestionKey(wine)

          if (!seen.has(key) && suggestions.length < 2) {
            seen.add(key)
            suggestions.push(wine)
          }
        })
    }

    return suggestions.slice(0, 2)
  }, [selectedWine, trimmedNome, winesWithLinks])

  const fillFromWine = useCallback((wine: WineType, codeOverride?: string) => {
    const wineCode = getWineCode(wine)
    const safeName = getWineName(wine)

    setSelectedWine(wine)
    setCodigo(existingCodeSet.has(wineCode) ? wineCode : codeOverride || wineCode)
    setNome(safeName)
    setCatalogQuery('')
    setSearchMessage('')
    setFormError('')
    setIsCatalogOpen(false)
  }, [existingCodeSet])

  const handleVoiceResult = useCallback((transcript: string) => {
    setCatalogQuery(transcript)
    setSearchMessage('')
    lastResolvedTypedEanRef.current = ''
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

  const handleEanResult = useCallback(
    (ean: string, source: 'camera' | 'typed' = 'camera') => {
      setCatalogQuery(ean)
      lastResolvedTypedEanRef.current = ean
      setSearchMessage(
        source === 'camera'
          ? `EAN ${ean} lido. Buscando vinho no catalogo...`
          : `Buscando EAN ${ean} no catalogo...`,
      )

      void buscarProdutoPorEANComComparacao(ean, winesWithLinks, eanLinks).then((result) => {
        const matchedWine =
          result.status === 'local'
            ? result.vinho
            : result.status === 'comparacao'
              ? result.melhorResultado?.wine
              : undefined

        if (matchedWine) {
          fillFromWine(matchedWine, ean)
          setSearchMessage(
            existingCodeSet.has(getWineCode(matchedWine))
              ? 'Vinho ja esta no estoque. Confirme para somar a quantidade.'
              : 'Vinho encontrado. Confira os dados e adicione ao estoque.',
          )
          return
        }

        if (result.status === 'comparacao' && result.produtoOnline.nome) {
          setCatalogQuery(result.produtoOnline.nome)
          setCodigo(ean)
          setNome(result.produtoOnline.nome)
          setSearchMessage('Produto online encontrado, mas nenhum vinho parecido no catalogo.')
          return
        }

        setCodigo(ean)
        setSearchMessage('Nenhum vinho encontrado para esse EAN.')
      })
    },
    [eanLinks, existingCodeSet, fillFromWine, winesWithLinks],
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

  useEffect(() => {
    const ean = normalizarEAN(catalogQuery)

    if (!isEanCompleto(catalogQuery)) {
      return undefined
    }

    if (lastResolvedTypedEanRef.current === ean) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      handleEanResult(ean, 'typed')
    }, EAN_QUERY_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [catalogQuery, handleEanResult])

  useEffect(() => {
    const safeCode = trimmedCodigo
    const normalizedCode = normalizarCodigoComparacao(safeCode)

    if (!safeCode) {
      lastResolvedManualCodeRef.current = ''
      return undefined
    }

    if (
      selectedWine &&
      getWineIdentifiers(selectedWine).some((identifier) => codigoIgual(safeCode, identifier))
    ) {
      lastResolvedManualCodeRef.current = normalizedCode
      return undefined
    }

    if (lastResolvedManualCodeRef.current === normalizedCode) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      const exactWine = findWineByExactCode(safeCode, winesWithLinks)

      if (exactWine) {
        lastResolvedManualCodeRef.current = normalizedCode
        fillFromWine(exactWine, safeCode)
        setSearchMessage(
          existingCodeSet.has(getWineCode(exactWine))
            ? 'Vinho ja esta no estoque. Confirme para somar a quantidade.'
            : 'Vinho encontrado pelo codigo informado.',
        )
        return
      }

      if (isEanCompleto(safeCode)) {
        const ean = normalizarEAN(safeCode)
        lastResolvedManualCodeRef.current = normalizedCode
        handleEanResult(ean, 'typed')
      }
    }, MANUAL_CODE_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [
    existingCodeSet,
    fillFromWine,
    handleEanResult,
    selectedWine,
    trimmedCodigo,
    winesWithLinks,
  ])

  function handleCatalogQueryChange(value: string) {
    setCatalogQuery(value)
    setSearchMessage('')
    clearVoiceError()

    if (!isEanCompleto(value)) {
      lastResolvedTypedEanRef.current = ''
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!trimmedCodigo || !trimmedNome) {
      setFormError('Informe o EAN/PLU e o nome do vinho.')
      return
    }

    onConfirm({
      wine: selectedWine,
      codigo: trimmedCodigo,
      nome: trimmedNome,
      quantidade: Math.max(1, Number(quantidade) || 1),
      localEstoque,
    })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-cellar shadow-cellar"
      >
        <div className="space-y-4 p-5">
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-brass/35 bg-brass/10 px-4 text-sm font-bold text-brass transition duration-200 hover:bg-brass hover:text-graphite focus:outline-none focus:ring-2 focus:ring-brass/60"
          >
            <Search size={18} aria-hidden="true" />
            Buscar no catalogo
          </button>

          {selectedWine ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <span className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-graphite/80">
                {getWineImage(selectedWine) ? (
                  <img
                    src={getWineImage(selectedWine)}
                    alt={getWineName(selectedWine)}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <Wine size={22} className="text-brass/75" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-ivory">
                  {getWineName(selectedWine)}
                </p>
                <p className="mt-1 text-xs font-bold text-brass">Dados puxados do catalogo</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWine(undefined)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
                aria-label="Limpar vinho selecionado"
                title="Limpar vinho selecionado"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-stone-400">EAN/PLU</span>
            <input
              value={codigo}
              onChange={(event) => {
                setCodigo(event.target.value)
                setSelectedWine(undefined)
                setSearchMessage('')
                setFormError('')
              }}
              className={inputClass}
              placeholder="Digite EAN, PLU ou codigo interno..."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Nome do vinho</span>
            <input
              value={nome}
              onChange={(event) => {
                setNome(event.target.value)
                setSelectedWine(undefined)
                setSearchMessage('')
                setFormError('')
              }}
              className={inputClass}
              placeholder="Digite o nome do vinho..."
            />
          </label>

          {nameSuggestions.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-white/10 bg-graphite/35 p-3">
              <p className="text-xs font-bold uppercase text-stone-400">
                Vinhos mais parecidos
              </p>
              <div className="grid gap-2">
                {nameSuggestions.map((wine, index) => {
                  const wineCode = getWineCode(wine)

                  return (
                    <WineSuggestionButton
                      key={`${wineCode}-${index}`}
                      wine={wine}
                      label={index === 0 ? 'Mais provável' : 'Também parecido'}
                      alreadyInStock={existingCodeSet.has(wineCode)}
                      onClick={() => {
                        fillFromWine(wine)
                        setSearchMessage(
                          index === 0
                            ? 'Vinho mais provavel selecionado.'
                            : 'Vinho parecido selecionado.',
                        )
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Quantidade</span>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(event) => setQuantidade(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Local do estoque</span>
              <select
                value={localEstoque}
                onChange={(event) => setLocalEstoque(event.target.value as StockLocation | '')}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Sem local definido</option>
                <option value="deposito">Deposito</option>
                <option value="area-venda">Area de venda</option>
              </select>
            </label>
          </div>

          {existingCodeSet.has(trimmedCodigo) ? (
            <p className="rounded-md border border-brass/25 bg-brass/10 px-3 py-2 text-sm text-brass">
              Este codigo ja esta no estoque. Ao adicionar, a quantidade sera somada ao item existente.
            </p>
          ) : null}

          {searchMessage && !isCatalogOpen ? (
            <p className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-stone-300">
              {searchMessage}
            </p>
          ) : null}

          {formError ? <p className="text-sm text-amber-200">{formError}</p> : null}
        </div>

        <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-white/10 bg-cellar/95 p-5 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-5 text-sm font-bold text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-brass px-5 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Adicionar vinho
          </button>
        </footer>
      </form>

      {isCatalogOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-cellar shadow-cellar">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <h2 className="text-lg font-semibold text-ivory">Catalogo de vinhos</h2>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
                aria-label="Fechar busca no catalogo"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-4 p-4">
              <div className="flex min-h-14 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-graphite/80 px-2 transition duration-200 focus-within:border-brass/60 focus-within:ring-2 focus-within:ring-brass/20 sm:px-3">
                <Search size={18} className="shrink-0 text-brass" aria-hidden="true" />
                <input
                  value={catalogQuery}
                  onChange={(event) => handleCatalogQueryChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ivory outline-none placeholder:text-stone-500"
                  placeholder="Buscar vinho por nome, codigo ou EAN..."
                  aria-label="Buscar vinho no catalogo por nome, codigo ou EAN"
                />
                <VoiceSearchButton
                  isListening={isListening}
                  isSupported={isVoiceSupported}
                  onClick={startListening}
                />
                <button
                  type="button"
                  onClick={startScanner}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-graphite/70 text-stone-200 transition duration-200 hover:border-brass/50 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
                  aria-label="Abrir leitor de codigo de barras"
                  title="Leitor de codigo de barras"
                >
                  <Camera size={20} strokeWidth={1.9} aria-hidden="true" />
                </button>
              </div>

              {isListening || voiceError || searchMessage ? (
                <p className={`text-sm ${voiceError ? 'text-amber-200' : 'text-stone-300'}`}>
                  {voiceError || (isListening ? 'Ouvindo...' : searchMessage)}
                </p>
              ) : null}

              <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-white/10 bg-graphite/35">
                {catalogResults.length > 0 ? (
                  <div className="divide-y divide-white/10">
                    {catalogResults.map((wine) => {
                      const wineCode = getWineCode(wine)
                      const wineName = getWineName(wine)
                      const image = getWineImage(wine)

                      return (
                        <button
                          key={wineCode}
                          type="button"
                          onClick={() => fillFromWine(wine)}
                          className="flex w-full items-center gap-3 p-3 text-left transition duration-200 hover:bg-white/[0.045]"
                        >
                          <span className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-graphite/80">
                            {image ? (
                              <img
                                src={image}
                                alt={wineName}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <Wine size={22} className="text-brass/75" aria-hidden="true" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-sm font-semibold text-ivory">
                              {wineName}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-brass">
                              <span>{wineCode}</span>
                              {existingCodeSet.has(wineCode) ? (
                                <span className="rounded-full border border-brass/30 bg-brass/10 px-2 py-0.5 text-[11px] text-brass">
                                  Ja no estoque
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-5 text-center text-sm text-stone-400">
                    Nenhum vinho encontrado no catalogo.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
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
