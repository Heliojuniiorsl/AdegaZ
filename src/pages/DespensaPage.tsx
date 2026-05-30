import { ArrowLeft, Plus, Warehouse, Wine, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import vinhosJson from '../data/vinhos-paodeacucar.json'
import { EanScannerModal } from '../components/EanScannerModal'
import {
  StockAddWineModal,
  type AddWineToStockData,
} from '../components/stock/StockAddWineModal'
import {
  StockEditWineModal,
  type EditStockProductData,
} from '../components/stock/StockEditWineModal'
import {
  ProductStatusBadge,
} from '../components/stock/ProductStatusBadge'
import { StockFilters } from '../components/stock/StockFilters'
import { StockTable } from '../components/stock/StockTable'
import { ThemeToggle } from '../components/ThemeToggle'
import { useEanScanner } from '../hooks/useEanScanner'
import { useVoiceSearch } from '../hooks/useVoiceSearch'
import type { Wine as WineType } from '../types/wine'
import type { StockFiltersState, StockProduct } from '../types/stock'
import {
  aplicarVinculosEAN,
  buscarProdutoPorEANComComparacao,
  carregarVinculosEAN,
  normalizarEAN,
} from '../utils/eanUtils'
import {
  createStockProductFromWine,
  createMockStockProducts,
  filterStockProducts,
  getStockLocationLabel,
  getStockStatus,
} from '../utils/stockUtils'
import { getCampoSeguro } from '../utils/wineUtils'

const initialStockProducts = createMockStockProducts()
const catalogWines = vinhosJson as WineType[]
const EAN_QUERY_DEBOUNCE_MS = 650

const emptyFilters: StockFiltersState = {
  query: '',
  tipo: 'todos',
  status: 'todos',
  local: 'todos',
}

function isEanCompleto(value: string) {
  const digits = normalizarEAN(value)

  return (
    value.trim() === digits &&
    (/^\d{8}$/.test(digits) || /^\d{12,14}$/.test(digits))
  )
}

function DetailImage({ product }: { product: StockProduct }) {
  const [hasError, setHasError] = useState(false)

  return (
    <div className="flex h-64 w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-graphite/70">
      {product.imagem && !hasError ? (
        <img
          src={product.imagem}
          alt={product.nome}
          className="h-full w-full object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <Wine size={56} className="text-brass/70" aria-hidden="true" />
      )}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
      <dt className="text-xs uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 line-clamp-2 text-sm font-semibold text-ivory">
        {value || 'Não informado'}
      </dd>
    </div>
  )
}

function ProductDetailsModal({
  product,
  onClose,
}: {
  product: StockProduct
  onClose: () => void
}) {
  const status = getStockStatus(product)

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <article className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-cellar shadow-cellar">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-cellar/95 p-5 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-brass">{product.codigo}</p>
            <h2 className="mt-1 line-clamp-2 text-xl font-semibold text-ivory">{product.nome}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-[240px_minmax(0,1fr)]">
          <DetailImage product={product} />
          <div className="min-w-0 space-y-4">
            <ProductStatusBadge status={status} />
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoBox label="Tipo" value={product.tipo} />
              <InfoBox label="Fornecedor" value={product.fornecedor} />
              <InfoBox label="Estoque atual" value={`${product.estoqueAtual} unidade(s)`} />
              <InfoBox label="Local do estoque" value={getStockLocationLabel(product.localEstoque)} />
              <InfoBox label="Movimentos em 30 dias" value={String(product.movimentos30Dias)} />
            </dl>
          </div>
        </div>
      </article>
    </div>
  )
}

function RemoveWineFromListModal({
  product,
  onCancel,
  onConfirm,
}: {
  product: StockProduct
  onCancel: () => void
  onConfirm: () => void
}) {
  const isLastUnit = product.estoqueAtual <= 1

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <article className="w-full max-w-lg rounded-lg border border-white/10 bg-cellar shadow-cellar">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-brass">
              {isLastUnit ? 'Ultima unidade' : 'Excluir vinho'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ivory">Remover vinho da lista?</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="p-5">
          <p className="text-sm leading-6 text-stone-300">
            {isLastUnit ? 'Esta e a ultima unidade de ' : 'Deseja remover '}
            <strong className="font-semibold text-ivory">{product.nome}</strong>
            {isLastUnit
              ? '. Se confirmar, o vinho sera removido da lista da despensa.'
              : ' da lista da despensa?'}
          </p>
          <p className="mt-3 text-xs text-stone-500">
            Se cancelar, a quantidade atual sera mantida.
          </p>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-5 text-sm font-bold text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
          >
            Manter na lista
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-rose-300/35 bg-rose-300/15 px-5 text-sm font-bold text-rose-100 transition duration-200 hover:border-rose-200"
          >
            Remover da lista
          </button>
        </footer>
      </article>
    </div>
  )
}

export function DespensaPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const lastResolvedTypedEanRef = useRef('')
  const eanLinks = useMemo(() => carregarVinculosEAN(), [])
  const catalogWinesWithLinks = useMemo(
    () => aplicarVinculosEAN(catalogWines, eanLinks),
    [eanLinks],
  )
  const [products, setProducts] = useState<StockProduct[]>(initialStockProducts)
  const [filters, setFilters] = useState<StockFiltersState>(emptyFilters)
  const [isAddWineOpen, setIsAddWineOpen] = useState(false)
  const [detailsProduct, setDetailsProduct] = useState<StockProduct | null>(null)
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null)
  const [pendingRemovalProduct, setPendingRemovalProduct] = useState<StockProduct | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (location.pathname !== '/despensa') {
      navigate('/despensa', { replace: true })
    }
  }, [location.pathname, navigate])

  const productsInStock = useMemo(
    () => products.filter((product) => product.estoqueAtual > 0),
    [products],
  )
  const filteredProducts = useMemo(
    () =>
      filterStockProducts(
        productsInStock,
        filters.query,
        filters.tipo,
        filters.status,
        filters.local,
      ),
    [filters, productsInStock],
  )
  const existingCodes = useMemo(() => products.map((product) => product.codigo), [products])

  const handleVoiceResult = useCallback((transcript: string) => {
    setFilters((current) => ({ ...current, query: transcript }))
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

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }, [])

  const handleFiltersChange = useCallback(
    (nextFilters: StockFiltersState) => {
      setFilters(nextFilters)
      clearVoiceError()

      if (!isEanCompleto(nextFilters.query)) {
        lastResolvedTypedEanRef.current = ''
      }
    },
    [clearVoiceError],
  )

  const handleEanResult = useCallback(
    (ean: string, source: 'camera' | 'typed' = 'camera') => {
      setFilters((current) => ({ ...current, query: ean }))
      lastResolvedTypedEanRef.current = ean
      showNotice(source === 'camera' ? `EAN ${ean} lido. Buscando vinho...` : `Buscando EAN ${ean}.`)

      void buscarProdutoPorEANComComparacao(ean, catalogWinesWithLinks, eanLinks).then((result) => {
        const matchedWine =
          result.status === 'local'
            ? result.vinho
            : result.status === 'comparacao'
              ? result.melhorResultado?.wine
              : undefined

        const codigo = getCampoSeguro(matchedWine?.codigo_produto, { maxLength: 80 })
        const nome = getCampoSeguro(matchedWine?.nome_produto, { maxLength: 180 })
        const productInStock = codigo
          ? products.find((product) => product.codigo === codigo)
          : undefined

        if (productInStock) {
          setFilters((current) => ({ ...current, query: productInStock.codigo }))
          showNotice('Vinho localizado no estoque pelo EAN.')
          return
        }

        if (nome) {
          setFilters((current) => ({ ...current, query: nome }))
          showNotice('Vinho encontrado no catálogo, mas ainda não está na despensa.')
          return
        }

        showNotice('Nenhum vinho encontrado para esse EAN.')
      })
    },
    [catalogWinesWithLinks, eanLinks, products, showNotice],
  )

  const {
    videoRef,
    isScannerOpen,
    isScanning,
    scannerError,
    isCameraSupported,
    cameraLabel,
    cameraCount,
    canSwitchCamera,
    startScanner,
    stopScanner,
    switchCamera,
  } = useEanScanner({
    onResult: handleEanResult,
  })

  useEffect(() => {
    const ean = normalizarEAN(filters.query)

    if (!isEanCompleto(filters.query)) {
      return undefined
    }

    if (lastResolvedTypedEanRef.current === ean) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      handleEanResult(ean, 'typed')
    }, EAN_QUERY_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [filters.query, handleEanResult])

  function handleAddWine(data: AddWineToStockData) {
    const baseProduct = data.wine
      ? createStockProductFromWine(data.wine, {
          estoqueAtual: data.quantidade,
          localEstoque: data.localEstoque || undefined,
        })
      : undefined
    const newProduct: StockProduct = {
      id: data.codigo,
      codigo: data.codigo,
      nome: data.nome,
      tipo: baseProduct?.tipo ?? 'Vinho',
      imagem: baseProduct?.imagem,
      fornecedor: baseProduct?.fornecedor,
      estoqueAtual: data.quantidade,
      localEstoque: data.localEstoque || undefined,
      saidasHoje: 0,
      movimentos30Dias: data.quantidade,
      diasSemMovimento: 0,
    }

    setProducts((current) => {
      const existingProduct = current.find((item) => item.codigo === newProduct.codigo)

      if (existingProduct) {
        return current.map((item) =>
          item.codigo === newProduct.codigo
            ? {
                ...item,
                estoqueAtual: item.estoqueAtual + data.quantidade,
                localEstoque: data.localEstoque || item.localEstoque,
                movimentos30Dias: item.movimentos30Dias + data.quantidade,
                diasSemMovimento: 0,
              }
            : item,
        )
      }

      return [newProduct, ...current]
    })
    setIsAddWineOpen(false)
    showNotice('Vinho adicionado ao estoque.')
  }

  function handleEditWine(data: EditStockProductData) {
    if (!editingProduct) {
      return
    }

    const editedProduct: StockProduct = {
      ...editingProduct,
      id: data.codigo,
      codigo: data.codigo,
      nome: data.nome,
      tipo: data.tipo,
      estoqueAtual: data.quantidade,
      localEstoque: data.localEstoque || undefined,
    }

    setProducts((current) =>
      current.map((item) => (item.id === editingProduct.id ? editedProduct : item)),
    )
    setDetailsProduct((current) =>
      current?.id === editingProduct.id ? editedProduct : current,
    )
    setEditingProduct(null)
    showNotice('Produto editado.')
  }

  function handleAddUnit(product: StockProduct) {
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              estoqueAtual: item.estoqueAtual + 1,
              movimentos30Dias: item.movimentos30Dias + 1,
              diasSemMovimento: 0,
            }
          : item,
      ),
    )
    showNotice('1 unidade adicionada.')
  }

  function handleRemoveUnit(product: StockProduct) {
    if (product.estoqueAtual <= 1) {
      setPendingRemovalProduct(product)
      return
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              estoqueAtual: item.estoqueAtual - 1,
              saidasHoje: item.saidasHoje + 1,
              movimentos30Dias: item.movimentos30Dias + 1,
              diasSemMovimento: 0,
            }
          : item,
      ),
    )
    showNotice('1 unidade removida.')
  }

  function handleAskDeleteProduct(product: StockProduct) {
    setPendingRemovalProduct(product)
  }

  function handleConfirmRemoveFromList() {
    if (!pendingRemovalProduct) {
      return
    }

    setProducts((current) => current.filter((item) => item.id !== pendingRemovalProduct.id))
    setDetailsProduct((current) =>
      current?.id === pendingRemovalProduct.id ? null : current,
    )
    setPendingRemovalProduct(null)
    showNotice('Vinho removido da lista.')
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-7xl items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brass/30 bg-brass/10 text-brass shadow-glow">
            <Warehouse size={24} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ivory">Despensa</h1>
            <p className="mt-1 hidden text-sm text-stone-400 sm:block">
              Controle de estoque dos vinhos
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            to="/adega"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-stone-200 transition duration-200 hover:border-brass/45 hover:text-brass sm:min-h-11 sm:px-4 sm:text-sm"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Voltar para Adega</span>
            <span className="sm:hidden">Adega</span>
          </Link>
        </div>
      </header>

      {notice ? (
        <div className="fixed right-4 top-4 z-40 rounded-md border border-brass/35 bg-graphite px-4 py-3 text-sm font-medium text-ivory shadow-cellar">
          {notice}
        </div>
      ) : null}

      <main className="mx-auto mt-6 w-full max-w-7xl space-y-5">
        <StockFilters
          filters={filters}
          onChange={handleFiltersChange}
          onCameraClick={startScanner}
          onVoiceClick={startListening}
          isListening={isListening}
          isVoiceSupported={isVoiceSupported}
          voiceError={voiceError}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-stone-400">
              {filteredProducts.length} produto(s) encontrados
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddWineOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brass px-4 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-brass/70"
          >
            <Plus size={17} aria-hidden="true" />
            Adicionar vinho
          </button>
        </div>

        <StockTable
          products={filteredProducts}
          onDetails={setDetailsProduct}
          onAddUnit={handleAddUnit}
          onRemoveUnit={handleRemoveUnit}
          onEdit={setEditingProduct}
          onDelete={handleAskDeleteProduct}
        />
      </main>

      {isAddWineOpen ? (
        <StockAddWineModal
          wines={catalogWines}
          existingCodes={existingCodes}
          onClose={() => setIsAddWineOpen(false)}
          onConfirm={handleAddWine}
        />
      ) : null}

      {detailsProduct ? (
        <ProductDetailsModal product={detailsProduct} onClose={() => setDetailsProduct(null)} />
      ) : null}

      {editingProduct ? (
        <StockEditWineModal
          product={editingProduct}
          existingCodes={existingCodes}
          onClose={() => setEditingProduct(null)}
          onConfirm={handleEditWine}
        />
      ) : null}

      {pendingRemovalProduct ? (
        <RemoveWineFromListModal
          product={pendingRemovalProduct}
          onCancel={() => setPendingRemovalProduct(null)}
          onConfirm={handleConfirmRemoveFromList}
        />
      ) : null}

      {isScannerOpen ? (
        <EanScannerModal
          videoRef={videoRef}
          isScanning={isScanning}
          error={scannerError}
          isSupported={isCameraSupported}
          cameraLabel={cameraLabel}
          cameraCount={cameraCount}
          canSwitchCamera={canSwitchCamera}
          onClose={stopScanner}
          onSwitchCamera={switchCamera}
        />
      ) : null}
    </div>
  )
}

export default DespensaPage
