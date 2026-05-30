import vinhosJson from '../data/vinhos-paodeacucar.json'
import type { StockLocation, StockMovement, StockProduct, StockStatus } from '../types/stock'
import type { Wine } from '../types/wine'
import { detectarCategoriaVinho, getCampoSeguro, normalizarTexto } from './wineUtils'

const stockSeeds = [
  {
    index: 0,
    estoqueAtual: 18,
    localEstoque: 'area-venda' as StockLocation,
    entradasEstoque: 24,
    saidasEstoque: 6,
    saidasHoje: 2,
    movimentos30Dias: 22,
    diasSemMovimento: 1,
  },
  {
    index: 1,
    estoqueAtual: 4,
    localEstoque: 'deposito' as StockLocation,
    entradasEstoque: 9,
    saidasEstoque: 5,
    saidasHoje: 1,
    movimentos30Dias: 15,
    diasSemMovimento: 3,
  },
  {
    index: 2,
    estoqueAtual: 1,
    localEstoque: 'deposito' as StockLocation,
    entradasEstoque: 3,
    saidasEstoque: 2,
    saidasHoje: 0,
    movimentos30Dias: 2,
    diasSemMovimento: 38,
  },
  {
    index: 3,
    estoqueAtual: 9,
    localEstoque: 'area-venda' as StockLocation,
    entradasEstoque: 14,
    saidasEstoque: 5,
    saidasHoje: 3,
    movimentos30Dias: 28,
    diasSemMovimento: 0,
  },
  {
    index: 4,
    estoqueAtual: 13,
    localEstoque: 'deposito' as StockLocation,
    entradasEstoque: 16,
    saidasEstoque: 3,
    saidasHoje: 0,
    movimentos30Dias: 7,
    diasSemMovimento: 9,
  },
  {
    index: 8,
    estoqueAtual: 2,
    localEstoque: undefined,
    entradasEstoque: 4,
    saidasEstoque: 2,
    saidasHoje: 0,
    movimentos30Dias: 4,
    diasSemMovimento: 21,
  },
  {
    index: 12,
    estoqueAtual: 21,
    localEstoque: 'area-venda' as StockLocation,
    entradasEstoque: 30,
    saidasEstoque: 9,
    saidasHoje: 5,
    movimentos30Dias: 44,
    diasSemMovimento: 0,
  },
  {
    index: 18,
    estoqueAtual: 7,
    localEstoque: 'deposito' as StockLocation,
    entradasEstoque: 10,
    saidasEstoque: 3,
    saidasHoje: 0,
    movimentos30Dias: 6,
    diasSemMovimento: 14,
  },
]

function detectarTipoEstoque(wine: Wine) {
  const categoria = detectarCategoriaVinho(wine)[0]
  const categoriaNormalizada = normalizarTexto(categoria)

  if (categoriaNormalizada.includes('rose')) return 'Rosé'
  return categoria || getCampoSeguro(wine.tipo, { maxLength: 40 }) || 'Vinho'
}

function getEanDoVinho(wine: Wine) {
  return (
    getCampoSeguro(wine.ean, { maxLength: 80 }) ??
    getCampoSeguro(wine.gtin, { maxLength: 80 }) ??
    getCampoSeguro(wine.codigo_ean, { maxLength: 80 }) ??
    getCampoSeguro(wine.codigo_barras, { maxLength: 80 }) ??
    getCampoSeguro(wine.codigo_de_barras, { maxLength: 80 })
  )
}

export function getStockStatus(product: StockProduct): StockStatus {
  if (product.estoqueAtual <= 0) return 'sem-estoque'
  return 'em-estoque'
}

export function getStatusLabel(status: StockStatus) {
  const labels: Record<StockStatus, string> = {
    'em-estoque': 'Em estoque',
    'sem-estoque': 'Sem estoque',
  }

  return labels[status]
}

export function getStockLocationLabel(local?: StockLocation) {
  const labels: Record<StockLocation, string> = {
    deposito: 'Depósito',
    'area-venda': 'Área de venda',
  }

  return local ? labels[local] : 'Sem local definido'
}

export function createStockProductFromWine(
  wine: Wine,
  options?: {
    estoqueAtual?: number
    localEstoque?: StockLocation
  },
): StockProduct {
  const codigo = getCampoSeguro(wine.codigo_produto, { maxLength: 80 }) ?? `vinho-${Date.now()}`

  return {
    id: codigo,
    codigo,
    ean: getEanDoVinho(wine),
    nome: getCampoSeguro(wine.nome_produto, { maxLength: 180 }) ?? 'Vinho sem nome',
    tipo: detectarTipoEstoque(wine),
    imagem: getCampoSeguro(wine.imagem_principal, { maxLength: 600 }),
    fornecedor: getCampoSeguro(wine.produtor, { maxLength: 90 }) ?? 'Fornecedor não informado',
    estoqueAtual: options?.estoqueAtual ?? 0,
    localEstoque: options?.localEstoque,
    entradasEstoque: options?.estoqueAtual ?? 0,
    saidasEstoque: 0,
    saidasHoje: 0,
    movimentos30Dias: options?.estoqueAtual ?? 0,
    diasSemMovimento: 0,
  }
}

export function createMockStockProducts(): StockProduct[] {
  const vinhos = vinhosJson as Wine[]

  return stockSeeds
    .filter((seed) => seed.estoqueAtual > 0)
    .map((seed, fallbackIndex) => {
      const { index, ...stock } = seed
      const wine = vinhos[index] ?? vinhos[fallbackIndex]

      return {
        ...createStockProductFromWine(wine, {
          estoqueAtual: stock.estoqueAtual,
          localEstoque: stock.localEstoque,
        }),
        ...stock,
      }
    })
}

export function createInitialMovements(products: StockProduct[]): StockMovement[] {
  return [
    {
      id: 'mov-1',
      data: new Date().toISOString(),
      produtoId: products[0]?.id ?? 'produto',
      produtoNome: products[0]?.nome ?? 'Produto',
      tipo: 'entrada',
      quantidade: 12,
      observacao: 'Reposição inicial da adega',
    },
    {
      id: 'mov-2',
      data: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      produtoId: products[3]?.id ?? 'produto',
      produtoNome: products[3]?.nome ?? 'Produto',
      tipo: 'venda',
      quantidade: 1,
      observacao: 'Venda no balcão',
    },
    {
      id: 'mov-3',
      data: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      produtoId: products[5]?.id ?? 'produto',
      produtoNome: products[5]?.nome ?? 'Produto',
      tipo: 'perda',
      quantidade: 2,
      observacao: 'Avaria identificada no recebimento',
    },
  ]
}

export function filterStockProducts(
  products: StockProduct[],
  query: string,
  tipo: string,
  status: string,
  local: string,
) {
  const normalizedQuery = normalizarTexto(query)

  return products.filter((product) => {
    const matchesQuery =
      !normalizedQuery ||
      normalizarTexto(product.nome).includes(normalizedQuery) ||
      normalizarTexto(product.codigo).includes(normalizedQuery) ||
      normalizarTexto(product.ean).includes(normalizedQuery)
    const matchesTipo = tipo === 'todos' || normalizarTexto(product.tipo).includes(tipo)
    const matchesStatus = status === 'todos' || getStockStatus(product) === status
    const matchesLocal =
      local === 'todos' ||
      product.localEstoque === local ||
      (local === 'sem-local' && !product.localEstoque)

    return matchesQuery && matchesTipo && matchesStatus && matchesLocal
  })
}
