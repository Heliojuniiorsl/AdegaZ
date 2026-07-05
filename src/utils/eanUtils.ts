import type { Wine } from '../types/wine'
import {
  detectarCategoriaVinho,
  getCampoSeguro,
  getUvaPreferida,
  normalizarTexto,
} from './wineUtils'

const EAN_LINKS_STORAGE_KEY = 'adegaz:eans-vinculados'
const EAN_LOOKUP_STORAGE_KEY = 'adegaz:ean-lookup-cache-v1'
const MIN_EAN_MATCH_SCORE = 70
const EAN_LOOKUP_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14
const EAN_LOOKUP_TIMEOUT_MS = 6500
const eanLookupMemoryCache = new Map<string, EanLookupCacheEntry>()

type FonteEANConsulta = () => Promise<ProdutoOnlineEAN[]>
type EanLookupCacheEntry = {
  savedAt: number
  produtos: ProdutoOnlineEAN[]
}

type ProdutoOnlineInput = {
  fonte?: unknown
  ean?: unknown
  nome?: unknown
  marca?: unknown
  imagem?: unknown
  confiancaFonte?: number
  quantidade?: unknown
  categoria?: unknown
  descricao?: unknown
}

type OpenFoodFactsProduct = {
  product_name?: string
  product_name_pt?: string
  product_name_en?: string
  generic_name?: string
  brands?: string
  quantity?: string
  categories?: string
  image_url?: string
}

type OpenFoodFactsResponse = {
  status?: number
  product?: OpenFoodFactsProduct
}

type UpcItemDbResponse = {
  code?: string
  total?: number
  items?: Array<{
    title?: string
    brand?: string
    size?: string
    description?: string
    category?: string
    images?: string[]
  }>
}

export type EanLinks = Record<string, string>

export type ProdutoOnlineEAN = {
  fonte: string
  ean: string
  nome: string
  marca?: string
  imagem?: string
  confiancaFonte: number
  quantidade?: string
  categoria?: string
  descricao?: string
}

export type ResultadoSimilarEAN = {
  wine: Wine
  score: number
  classificacao: 'provavel' | 'conferir' | 'baixo'
  motivos: string[]
  nomeNormalizadoLocal: string
}

export type ResultadoBuscaEAN =
  | {
      status: 'local'
      ean: string
      vinho: Wine
      origem: 'vinculo-local' | 'campo-local'
    }
  | {
      status: 'online-sem-produto'
      ean: string
      produtoOnline: null
      resultadosSimilares: ResultadoSimilarEAN[]
    }
  | {
      status: 'comparacao'
      ean: string
      produtoOnline: ProdutoOnlineEAN
      produtosOnline: ProdutoOnlineEAN[]
      nomeNormalizadoOnline: string
      resultadosSimilares: ResultadoSimilarEAN[]
      melhorResultado?: ResultadoSimilarEAN
      classificacaoGeral: 'provavel' | 'conferir' | 'baixo'
    }
  | {
      status: 'erro'
      ean: string
      mensagem: string
      resultadosSimilares: ResultadoSimilarEAN[]
    }

export type EanResolutionState =
  | ResultadoBuscaEAN
  | {
      status: 'carregando'
      ean: string
    }
  | {
      status: 'vinculado'
      ean: string
      vinho: Wine
      produtoOnline?: ProdutoOnlineEAN
    }

const palavrasGenericas = new Set([
  'vinho',
  'vh',
  'garrafa',
  'produto',
  'unidade',
  'bebida',
  'bebidas',
  'alcoolica',
  'alcoolico',
  'adega',
  'cooperativa',
  'vinicola',
  'ltda',
  'companhia',
  'cia',
  'un',
  'und',
  'ml',
  'lt',
  'litro',
  'litros',
])

const abreviacoes: Record<string, string[]> = {
  cds: ['club', 'des', 'sommeliers'],
  ros: ['rose'],
  rose: ['rose'],
  sv: ['suave'],
  sec: ['seco'],
  fris: ['frisante'],
  esp: ['espumante'],
  vh: ['vinho'],
}

export function normalizarEAN(valor: unknown) {
  return String(valor ?? '').replace(/\D/g, '')
}

export function isPossivelEANCompleto(valor: unknown) {
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(normalizarEAN(valor))
}

function isTokenVolume(token: string) {
  return /^(?:\d+(?:ml|l)|ml|l|lt)$/.test(token)
}

function tokenizarNomeProduto(valor: unknown) {
  const base = normalizarTexto(valor)
    .replace(/\bdemi\s*-?\s*sec\b/g, 'demisec')
    .replace(/\bros[e]?\b/g, 'rose')
    .replace(/(\d+)\s*(ml|l)\b/g, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!base) {
    return []
  }

  const tokens: string[] = []

  for (const token of base.split(/\s+/)) {
    const expansao = abreviacoes[token]

    if (expansao) {
      tokens.push(...expansao)
      continue
    }

    tokens.push(token)
  }

  return tokens.filter(
    (token) => token.length > 1 && !palavrasGenericas.has(token) && !isTokenVolume(token),
  )
}

export function normalizarNomeProdutoParaEAN(valor: unknown) {
  return tokenizarNomeProduto(valor).join(' ')
}

function normalizarVolume(raw: string) {
  const [, quantidade, unidade] = raw.match(/^(\d+)(ml|l)$/) ?? []

  if (!quantidade || !unidade) {
    return raw
  }

  if (unidade === 'l') {
    return `${Number(quantidade) * 1000}ml`
  }

  return `${Number(quantidade)}ml`
}

function extrairVolumes(valor: unknown) {
  const texto = normalizarTexto(valor)
    .replace(/(\d+)\s*(ml|l)\b/g, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')

  return [...texto.matchAll(/\b\d+(?:ml|l)\b/g)].map((match) => normalizarVolume(match[0]))
}

function getCodigosLocais(wine: Wine) {
  return [
    wine.ean,
    wine.gtin,
    wine.codigo_ean,
    wine.codigo_barras,
    wine.codigo_de_barras,
  ]
    .map(normalizarEAN)
    .filter(Boolean)
}

function getCodigoProduto(wine: Wine) {
  return normalizarEAN(wine.codigo_produto)
}

function montarTextoComparacaoLocal(wine: Wine) {
  return [
    wine.nome_produto,
    wine.marca,
    wine.produtor,
    wine.tipo,
    wine.cor_do_vinho,
    getUvaPreferida(wine),
    wine.variedade_da_uva,
    wine.pais_de_origem,
    wine.regiao,
  ]
    .filter(Boolean)
    .join(' ')
}

function montarTextoComparacaoOnline(produtoOnline: ProdutoOnlineEAN) {
  return [
    produtoOnline.nome,
    produtoOnline.marca,
    produtoOnline.quantidade,
    produtoOnline.categoria,
  ]
    .filter(Boolean)
    .join(' ')
}

function calcularDistanciaLevenshtein(a: string, b: string) {
  const matriz = Array.from({ length: b.length + 1 }, (_, index) => [index])

  for (let coluna = 0; coluna <= a.length; coluna += 1) {
    matriz[0][coluna] = coluna
  }

  for (let linha = 1; linha <= b.length; linha += 1) {
    for (let coluna = 1; coluna <= a.length; coluna += 1) {
      matriz[linha][coluna] =
        b.charAt(linha - 1) === a.charAt(coluna - 1)
          ? matriz[linha - 1][coluna - 1]
          : Math.min(
              matriz[linha - 1][coluna - 1] + 1,
              matriz[linha][coluna - 1] + 1,
              matriz[linha - 1][coluna] + 1,
            )
    }
  }

  return matriz[b.length][a.length]
}

function calcularSimilaridadeToken(a: string, b: string) {
  if (a === b) {
    return 1
  }

  if (a.length <= 2 || b.length <= 2) {
    return 0
  }

  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length)
  }

  const distancia = calcularDistanciaLevenshtein(a, b)
  return Math.max(0, 1 - distancia / Math.max(a.length, b.length))
}

function mediaSimilaridadeTokens(tokensOrigem: string[], tokensDestino: string[]) {
  if (tokensOrigem.length === 0 || tokensDestino.length === 0) {
    return 0
  }

  const total = tokensOrigem.reduce((soma, tokenOrigem) => {
    const melhor = Math.max(
      ...tokensDestino.map((tokenDestino) => calcularSimilaridadeToken(tokenOrigem, tokenDestino)),
    )

    return soma + (melhor >= 0.72 ? melhor : 0)
  }, 0)

  return total / tokensOrigem.length
}

function detectarCategoriasEmNomeNormalizado(texto: string) {
  const categorias = new Set<string>()

  if (/\btinto\b/.test(texto)) categorias.add('Tinto')
  if (/\bbranco\b/.test(texto)) categorias.add('Branco')
  if (/\brose\b/.test(texto)) categorias.add('Rosé')
  if (/\b(espumante|frisante|cava)\b/.test(texto)) categorias.add('Espumante')

  return categorias
}

function classificarScore(score: number): ResultadoSimilarEAN['classificacao'] {
  if (score >= 80) return 'provavel'
  if (score >= 50) return 'conferir'
  return 'baixo'
}

function calcularSimilaridadeProduto(produtoOnline: ProdutoOnlineEAN, wine: Wine) {
  const textoOnline = montarTextoComparacaoOnline(produtoOnline)
  const textoLocal = montarTextoComparacaoLocal(wine)
  const nomeOnlineNormalizado = normalizarNomeProdutoParaEAN(textoOnline)
  const nomeLocalNormalizado = normalizarNomeProdutoParaEAN(textoLocal)
  const tokensOnline = nomeOnlineNormalizado.split(' ').filter(Boolean)
  const tokensLocal = nomeLocalNormalizado.split(' ').filter(Boolean)
  const tokensLocalSet = new Set(tokensLocal)
  const tokensOnlineSet = new Set(tokensOnline)
  const iguaisOnline = tokensOnline.filter((token) => tokensLocalSet.has(token)).length
  const iguaisLocal = tokensLocal.filter((token) => tokensOnlineSet.has(token)).length
  const coberturaOnline = tokensOnline.length > 0 ? iguaisOnline / tokensOnline.length : 0
  const coberturaLocal = tokensLocal.length > 0 ? iguaisLocal / Math.min(tokensLocal.length, 10) : 0
  const coberturaFuzzy = mediaSimilaridadeTokens(tokensOnline, tokensLocal)
  const volumesOnline = extrairVolumes(textoOnline)
  const volumesLocal = extrairVolumes(textoLocal)
  const volumeIgual =
    volumesOnline.length > 0 &&
    volumesLocal.length > 0 &&
    volumesOnline.some((volume) => volumesLocal.includes(volume))
  const categoriasOnline = detectarCategoriasEmNomeNormalizado(nomeOnlineNormalizado)
  const categoriasLocal = new Set([
    ...detectarCategoriaVinho(wine),
    ...detectarCategoriasEmNomeNormalizado(nomeLocalNormalizado),
  ])
  const categoriaIgual =
    categoriasOnline.size > 0 &&
    [...categoriasOnline].some((categoria) => categoriasLocal.has(categoria))
  const marcaOnlineTokens = normalizarNomeProdutoParaEAN(produtoOnline.marca)
    .split(' ')
    .filter(Boolean)
  const marcaLocalTokens = normalizarNomeProdutoParaEAN(wine.marca)
    .split(' ')
    .filter(Boolean)
  const marcaScore =
    marcaOnlineTokens.length > 0 && marcaLocalTokens.length > 0
      ? mediaSimilaridadeTokens(marcaOnlineTokens, marcaLocalTokens)
      : 0
  const marcaIgual = marcaScore >= 0.72
  const uvaTokens = normalizarNomeProdutoParaEAN(
    [getUvaPreferida(wine), wine.variedade_da_uva].filter(Boolean).join(' '),
  )
    .split(' ')
    .filter(Boolean)
  const uvaScore =
    tokensOnline.length > 0 && uvaTokens.length > 0
      ? mediaSimilaridadeTokens(uvaTokens, tokensOnline)
      : 0
  const origemTokens = normalizarNomeProdutoParaEAN(
    [wine.pais_de_origem, wine.regiao].filter(Boolean).join(' '),
  )
    .split(' ')
    .filter(Boolean)
  const origemScore =
    tokensOnline.length > 0 && origemTokens.length > 0
      ? mediaSimilaridadeTokens(origemTokens, tokensOnline)
      : 0

  const pontuacao =
    coberturaOnline * 0.35 +
    coberturaFuzzy * 0.22 +
    coberturaLocal * 0.1 +
    marcaScore * 0.18 +
    (categoriaIgual ? 0.08 : 0) +
    Math.min(uvaScore, 1) * 0.06 +
    (volumeIgual ? 0.06 : 0) +
    Math.min(origemScore, 1) * 0.03
  const score = Math.max(0, Math.min(100, Math.round(pontuacao * 100)))
  const motivos = [
    coberturaOnline >= 0.55 ? 'palavras principais parecidas' : undefined,
    coberturaFuzzy >= 0.65 ? 'termos aproximados encontrados' : undefined,
    volumeIgual ? 'volume igual' : undefined,
    categoriaIgual ? 'categoria compatível' : undefined,
    marcaIgual ? 'marca parecida' : undefined,
    uvaScore >= 0.72 ? 'uva parecida' : undefined,
    origemScore >= 0.72 ? 'origem parecida' : undefined,
  ].filter((motivo): motivo is string => Boolean(motivo))

  return {
    score,
    classificacao: classificarScore(score),
    motivos,
    nomeNormalizadoLocal: nomeLocalNormalizado,
  }
}

function limitarConfiancaFonte(value: number | undefined, fallback: number) {
  const confianca = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(0, Math.min(1, confianca))
}

function getImagemSegura(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.map(getImagemSegura).find(Boolean)
  }

  if (isRecord(value)) {
    return getCampoSeguro(value.url ?? value.contentUrl, { maxLength: 600 })
  }

  return getCampoSeguro(value, { maxLength: 600 })
}

function padronizarProdutoOnline(
  produto: ProdutoOnlineInput,
  confiancaPadrao: number,
): ProdutoOnlineEAN | null {
  const ean = normalizarEAN(produto.ean)
  const nome = getCampoSeguro(produto.nome, { maxLength: 220 })
  const fonte = getCampoSeguro(produto.fonte, { maxLength: 80 })

  if (!isPossivelEANCompleto(ean) || !nome || !fonte) {
    return null
  }

  return {
    fonte,
    ean,
    nome,
    marca: getCampoSeguro(produto.marca, { maxLength: 120 }),
    imagem: getImagemSegura(produto.imagem),
    confiancaFonte: limitarConfiancaFonte(produto.confiancaFonte, confiancaPadrao),
    quantidade: getCampoSeguro(produto.quantidade, { maxLength: 80 }),
    categoria: getCampoSeguro(produto.categoria, { maxLength: 180 }),
    descricao: getCampoSeguro(produto.descricao, { maxLength: 500 }),
  } satisfies ProdutoOnlineEAN
}

async function fetchJsonComTimeout<T>(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EAN_LOOKUP_TIMEOUT_MS)
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Fonte respondeu com HTTP ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchTextComTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EAN_LOOKUP_TIMEOUT_MS)
  const headers = new Headers(init.headers)
  headers.set('Accept', 'text/html')

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Fonte respondeu com HTTP ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchPrimeiroTextoDisponivel(urls: string[]) {
  let lastError: unknown

  for (const url of urls) {
    try {
      return await fetchTextComTimeout(url)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Nenhuma fonte respondeu.')
}

function criarUrlProxyCors(url: string) {
  return `https://api.cors.lol/?url=${encodeURIComponent(url)}`
}

async function consultarEndpointProduto(ean: string, baseUrl: string, fonte: string) {
  const fields = [
    'code',
    'product_name',
    'product_name_pt',
    'product_name_en',
    'generic_name',
    'brands',
    'quantity',
    'categories',
    'image_url',
  ].join(',')
  const url = `${baseUrl}/api/v2/product/${encodeURIComponent(ean)}.json?fields=${fields}`
  const data = await fetchJsonComTimeout<OpenFoodFactsResponse>(url)

  if (data.status !== 1 || !data.product) {
    return null
  }

  const nome = getCampoSeguro(
    data.product.product_name_pt ??
      data.product.product_name ??
      data.product.product_name_en ??
      data.product.generic_name,
    { maxLength: 220 },
  )

  if (!nome) {
    return null
  }

  return padronizarProdutoOnline(
    {
      ean,
      nome,
      marca: data.product.brands,
      quantidade: data.product.quantity,
      categoria: data.product.categories,
      imagem: data.product.image_url,
      fonte,
      confiancaFonte: 0.74,
    },
    0.74,
  )
}

async function consultarUpcItemDbPorEAN(ean: string) {
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(ean)}`
  const data = await fetchJsonComTimeout<UpcItemDbResponse>(url)

  if (data.code !== 'OK' || !Array.isArray(data.items)) {
    return []
  }

  return data.items
    .map((item) =>
      padronizarProdutoOnline(
        {
          fonte: 'UPCitemdb',
          ean,
          nome: item.title ?? item.description ?? '',
          marca: item.brand,
          imagem: item.images,
          quantidade: item.size,
          categoria: item.category,
          descricao: item.description,
          confiancaFonte: 0.82,
        },
        0.82,
      ),
    )
    .filter((produto): produto is ProdutoOnlineEAN => Boolean(produto))
}

function montarCodigoWireshape(ean: string) {
  return `0x${ean.padStart(64, '0')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getJsonString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function getJsonTypeList(value: Record<string, unknown>) {
  const type = value['@type']

  if (Array.isArray(type)) {
    return type.filter((item): item is string => typeof item === 'string')
  }

  return typeof type === 'string' ? [type] : []
}

function getBrandName(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (isRecord(value)) {
    return getJsonString(value.name)
  }

  return undefined
}

function getJsonLdItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(getJsonLdItems)
  }

  if (!isRecord(value)) {
    return []
  }

  const nested = value['@graph'] ? getJsonLdItems(value['@graph']) : []
  return [value, ...nested]
}

function extractJsonLdProducts(html: string) {
  const scripts = html.matchAll(
    /<script[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi,
  )
  const products: Record<string, unknown>[] = []

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1].trim()) as unknown
      products.push(
        ...getJsonLdItems(parsed).filter((item) => getJsonTypeList(item).includes('Product')),
      )
    } catch {
      // Ignora JSON-LD invalido da pagina e tenta o proximo bloco.
    }
  }

  return products
}

function detectarMarcaConhecida(texto: string) {
  const normalizado = normalizarTexto(texto)

  if (normalizado.includes('club des sommeliers') || normalizado.includes('clube des sommeliers')) {
    return 'Club Des Sommeliers'
  }

  return undefined
}

function extrairQuantidadeDeTexto(texto: string) {
  return texto.match(/\b\d+\s*(?:ml|l)\b/i)?.[0]?.replace(/\s+/g, '')
}

async function consultarWireshapePorEAN(ean: string) {
  const path = `/registry/${montarCodigoWireshape(ean)}`
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const isStaticHosted = hostname.endsWith('github.io')
  const wireshapeUrl = `https://data.wireshape.com${path}`
  const urls =
    typeof window !== 'undefined' && !isStaticHosted
      ? [`/api/wireshape${path}`, wireshapeUrl]
      : [criarUrlProxyCors(wireshapeUrl), wireshapeUrl]
  const html = await fetchPrimeiroTextoDisponivel(urls)
  const product = extractJsonLdProducts(html)[0]

  if (!product) {
    return null
  }

  const nome = getCampoSeguro(product.name, { maxLength: 220 })

  if (!nome) {
    return null
  }

  const descricao = getCampoSeguro(product.description, { maxLength: 500 })
  const textoCompleto = [nome, descricao].filter(Boolean).join(' ')
  const marca = detectarMarcaConhecida(textoCompleto) ?? getCampoSeguro(getBrandName(product.brand), { maxLength: 120 })

  return padronizarProdutoOnline(
    {
      ean,
      nome,
      marca,
      imagem: getImagemSegura(product.image),
      quantidade: extrairQuantidadeDeTexto(nome) ?? getCampoSeguro(product.weight, { maxLength: 80 }),
      categoria: getCampoSeguro(product.additionalType, { maxLength: 180 }),
      descricao,
      fonte: 'Wireshape Data',
      confiancaFonte: 0.88,
    },
    0.88,
  )
}

async function consultarOpenFoodFactsPorEAN(ean: string) {
  const produto = await consultarEndpointProduto(
    ean,
    'https://world.openfoodfacts.org',
    'Open Food Facts',
  )

  return produto ? [produto] : []
}

async function consultarOpenProductsFactsPorEAN(ean: string) {
  const produto = await consultarEndpointProduto(
    ean,
    'https://world.openproductsfacts.org',
    'Open Products Facts',
  )

  return produto ? [produto] : []
}

async function consultarWireshapeListaPorEAN(ean: string) {
  const produto = await consultarWireshapePorEAN(ean)
  return produto ? [produto] : []
}

function normalizarResultadoProxy(value: unknown, ean: string) {
  if (!isRecord(value)) {
    return null
  }

  return padronizarProdutoOnline(
    {
      fonte: getJsonString(value.fonte) ?? getJsonString(value.source) ?? 'Proxy EAN',
      ean: getJsonString(value.ean) ?? getJsonString(value.gtin) ?? ean,
      nome:
        getJsonString(value.nome) ??
        getJsonString(value.name) ??
        getJsonString(value.title) ??
        '',
      marca: getJsonString(value.marca) ?? getJsonString(value.brand),
      imagem: value.imagem ?? value.image ?? value.imageUrl,
      quantidade: getJsonString(value.quantidade) ?? getJsonString(value.size),
      categoria: getJsonString(value.categoria) ?? getJsonString(value.category),
      descricao: getJsonString(value.descricao) ?? getJsonString(value.description),
      confiancaFonte:
        typeof value.confiancaFonte === 'number'
          ? value.confiancaFonte
          : typeof value.sourceConfidence === 'number'
            ? value.sourceConfidence
            : 0.78,
    },
    0.78,
  )
}

async function consultarProxyConfiguradoPorEAN(ean: string) {
  const proxyBase = (import.meta.env.VITE_EAN_LOOKUP_PROXY_URL as string | undefined)?.trim()

  if (!proxyBase) {
    return []
  }

  const url = `${proxyBase.replace(/\/$/, '')}?ean=${encodeURIComponent(ean)}`
  const data = await fetchJsonComTimeout<unknown>(url)
  const lista = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.resultados)
      ? data.resultados
      : isRecord(data) && Array.isArray(data.results)
        ? data.results
        : []

  return lista
    .map((item) => normalizarResultadoProxy(item, ean))
    .filter((produto): produto is ProdutoOnlineEAN => Boolean(produto))
}

function getCacheStorage() {
  if (typeof localStorage === 'undefined') {
    return {}
  }

  try {
    return JSON.parse(localStorage.getItem(EAN_LOOKUP_STORAGE_KEY) ?? '{}') as Record<
      string,
      EanLookupCacheEntry
    >
  } catch {
    return {}
  }
}

function getProdutosEmCache(ean: string) {
  const memoryEntry = eanLookupMemoryCache.get(ean)

  if (memoryEntry && Date.now() - memoryEntry.savedAt <= EAN_LOOKUP_CACHE_TTL_MS) {
    if (memoryEntry.produtos.length > 0) {
      return memoryEntry.produtos
    }

    eanLookupMemoryCache.delete(ean)
  }

  const cache = getCacheStorage()
  const entry = cache[ean]

  if (!entry || Date.now() - entry.savedAt > EAN_LOOKUP_CACHE_TTL_MS) {
    return undefined
  }

  if (!Array.isArray(entry.produtos) || entry.produtos.length === 0) {
    delete cache[ean]

    try {
      localStorage.setItem(EAN_LOOKUP_STORAGE_KEY, JSON.stringify(cache))
    } catch {
      // Cache e apenas uma otimizacao; se falhar, a busca continua funcionando.
    }

    return undefined
  }

  eanLookupMemoryCache.set(ean, entry)
  return entry.produtos
}

function salvarProdutosEmCache(ean: string, produtos: ProdutoOnlineEAN[]) {
  if (produtos.length === 0) {
    eanLookupMemoryCache.delete(ean)

    if (typeof localStorage !== 'undefined') {
      try {
        const cache = getCacheStorage()
        delete cache[ean]
        localStorage.setItem(EAN_LOOKUP_STORAGE_KEY, JSON.stringify(cache))
      } catch {
        // Cache e apenas uma otimizacao; se falhar, a busca continua funcionando.
      }
    }

    return
  }

  eanLookupMemoryCache.set(ean, {
    savedAt: Date.now(),
    produtos,
  })

  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    const cache = getCacheStorage()
    cache[ean] = {
      savedAt: Date.now(),
      produtos,
    }
    localStorage.setItem(EAN_LOOKUP_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Cache e apenas uma otimizacao; se falhar, a busca continua funcionando.
  }
}

function deduplicarProdutosOnline(produtos: ProdutoOnlineEAN[]) {
  const porNome = new Map<string, ProdutoOnlineEAN>()

  for (const produto of produtos) {
    const chave =
      normalizarNomeProdutoParaEAN([produto.nome, produto.marca].filter(Boolean).join(' ')) ||
      `${produto.ean}:${produto.fonte}`
    const atual = porNome.get(chave)

    if (
      !atual ||
      produto.confiancaFonte > atual.confiancaFonte ||
      (!atual.imagem && produto.imagem)
    ) {
      porNome.set(chave, produto)
    }
  }

  return [...porNome.values()].sort((a, b) => {
    if (Boolean(a.imagem) !== Boolean(b.imagem)) {
      return a.imagem ? -1 : 1
    }

    return b.confiancaFonte - a.confiancaFonte
  })
}

export async function buscarProdutoPorEAN(ean: string) {
  const eanNormalizado = normalizarEAN(ean)

  if (!isPossivelEANCompleto(eanNormalizado)) {
    return []
  }

  const cached = getProdutosEmCache(eanNormalizado)

  if (cached) {
    return cached
  }

  const fontes: FonteEANConsulta[] = [
    () => consultarProxyConfiguradoPorEAN(eanNormalizado),
    () => consultarUpcItemDbPorEAN(eanNormalizado),
    () => consultarOpenFoodFactsPorEAN(eanNormalizado),
    () => consultarOpenProductsFactsPorEAN(eanNormalizado),
    () => consultarWireshapeListaPorEAN(eanNormalizado),
  ]
  const resultados = await Promise.allSettled(fontes.map((consultar) => consultar()))
  const produtos = resultados.flatMap((resultado) =>
    resultado.status === 'fulfilled' ? resultado.value : [],
  )
  const deduplicados = deduplicarProdutosOnline(produtos)

  salvarProdutosEmCache(eanNormalizado, deduplicados)
  return deduplicados
}

export function carregarVinculosEAN(): EanLinks {
  if (typeof localStorage === 'undefined') {
    return {}
  }

  try {
    const bruto = localStorage.getItem(EAN_LINKS_STORAGE_KEY)
    const parsed = bruto ? (JSON.parse(bruto) as EanLinks) : {}

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([ean, codigo]) => [normalizarEAN(ean), normalizarEAN(codigo)])
        .filter(([ean, codigo]) => ean && codigo),
    )
  } catch {
    return {}
  }
}

export function salvarVinculoEAN(ean: string, wine: Wine, vinculosAtuais: EanLinks) {
  const eanNormalizado = normalizarEAN(ean)
  const codigoProduto = getCodigoProduto(wine)

  if (!eanNormalizado || !codigoProduto) {
    return vinculosAtuais
  }

  const proximos = {
    ...vinculosAtuais,
    [eanNormalizado]: codigoProduto,
  }

  localStorage.setItem(EAN_LINKS_STORAGE_KEY, JSON.stringify(proximos))
  return proximos
}

export function aplicarVinculosEAN(vinhos: Wine[], vinculos: EanLinks) {
  const primeiroEanPorCodigo = new Map<string, string>()

  for (const [ean, codigo] of Object.entries(vinculos)) {
    if (!primeiroEanPorCodigo.has(codigo)) {
      primeiroEanPorCodigo.set(codigo, ean)
    }
  }

  return vinhos.map((wine) => {
    const codigo = getCodigoProduto(wine)
    const eanVinculado = codigo ? primeiroEanPorCodigo.get(codigo) : undefined

    return eanVinculado ? { ...wine, ean: eanVinculado } : wine
  })
}

export function buscarVinhoPorEANLocal(vinhos: Wine[], ean: string, vinculos: EanLinks) {
  const eanNormalizado = normalizarEAN(ean)
  const codigoVinculado = vinculos[eanNormalizado]

  if (codigoVinculado) {
    const vinhoVinculado = vinhos.find((wine) => getCodigoProduto(wine) === codigoVinculado)

    if (vinhoVinculado) {
      return {
        vinho: vinhoVinculado,
        origem: 'vinculo-local' as const,
      }
    }
  }

  const vinhoComCampoEan = vinhos.find((wine) => getCodigosLocais(wine).includes(eanNormalizado))

  return vinhoComCampoEan
    ? {
        vinho: vinhoComCampoEan,
        origem: 'campo-local' as const,
      }
    : undefined
}

export async function buscarProdutoPorEANComComparacao(
  ean: string,
  vinhos: Wine[],
  vinculos: EanLinks = carregarVinculosEAN(),
) {
  const eanNormalizado = normalizarEAN(ean)
  console.log('EAN lido:', eanNormalizado)

  const vinhoLocal = buscarVinhoPorEANLocal(vinhos, eanNormalizado, vinculos)

  if (vinhoLocal) {
    console.log('Produto encontrado online:', null)
    console.log('Nome normalizado online:', '')
    console.log('Comparando com banco local...')
    console.log('Resultados similares:', [])

    return {
      status: 'local',
      ean: eanNormalizado,
      vinho: vinhoLocal.vinho,
      origem: vinhoLocal.origem,
    } satisfies ResultadoBuscaEAN
  }

  try {
    const produtosOnline = await buscarProdutoPorEAN(eanNormalizado)
    const primeiroProdutoOnline = produtosOnline[0]
    console.log('Produto encontrado online:', primeiroProdutoOnline ?? null)

    if (!primeiroProdutoOnline) {
      console.log('Nome normalizado online:', '')
      console.log('Comparando com banco local...')
      console.log('Resultados similares:', [])

      return {
        status: 'online-sem-produto',
        ean: eanNormalizado,
        produtoOnline: null,
        resultadosSimilares: [],
      } satisfies ResultadoBuscaEAN
    }

    const nomeNormalizadoOnline = normalizarNomeProdutoParaEAN(
      montarTextoComparacaoOnline(primeiroProdutoOnline),
    )
    console.log('Nome normalizado online:', nomeNormalizadoOnline)
    console.log('Comparando com banco local...')

    const melhoresPorVinho = new Map<
      string,
      ResultadoSimilarEAN & { produtoOnline: ProdutoOnlineEAN }
    >()

    produtosOnline.forEach((produtoOnline) => {
      vinhos.forEach((wine, index) => {
        const resultado = {
          wine,
          ...calcularSimilaridadeProduto(produtoOnline, wine),
          produtoOnline,
        }

        if (resultado.score < MIN_EAN_MATCH_SCORE) {
          return
        }

        const chave = getCodigoProduto(wine) || `${index}:${normalizarTexto(wine.nome_produto)}`
        const atual = melhoresPorVinho.get(chave)

        if (!atual || resultado.score > atual.score) {
          melhoresPorVinho.set(chave, resultado)
        }
      })
    })

    const resultadosComProduto = [...melhoresPorVinho.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
    const resultadosSimilares = resultadosComProduto.map((resultado) => ({
      wine: resultado.wine,
      score: resultado.score,
      classificacao: resultado.classificacao,
      motivos: resultado.motivos,
      nomeNormalizadoLocal: resultado.nomeNormalizadoLocal,
    }))

    console.log('Resultados similares:', resultadosSimilares)

    const melhorResultado = resultadosSimilares[0]
    const produtoOnline = resultadosComProduto[0]?.produtoOnline ?? primeiroProdutoOnline
    const nomeNormalizadoSelecionado = normalizarNomeProdutoParaEAN(
      montarTextoComparacaoOnline(produtoOnline),
    )

    return {
      status: 'comparacao',
      ean: eanNormalizado,
      produtoOnline,
      produtosOnline,
      nomeNormalizadoOnline: nomeNormalizadoSelecionado,
      resultadosSimilares,
      melhorResultado,
      classificacaoGeral: classificarScore(melhorResultado?.score ?? 0),
    } satisfies ResultadoBuscaEAN
  } catch (error) {
    console.log('Produto encontrado online:', null)
    console.log('Nome normalizado online:', '')
    console.log('Comparando com banco local...')
    console.log('Resultados similares:', [])

    return {
      status: 'erro',
      ean: eanNormalizado,
      mensagem:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel consultar o produto online.',
      resultadosSimilares: [],
    } satisfies ResultadoBuscaEAN
  }
}
