import type { Wine } from '../types/wine'
import {
  detectarCategoriaVinho,
  getCampoSeguro,
  getUvaPreferida,
  normalizarTexto,
} from './wineUtils'

const EAN_LINKS_STORAGE_KEY = 'adegaz:eans-vinculados'
const MIN_EAN_MATCH_SCORE = 70

type OpenFoodFactsProduct = {
  product_name?: string
  product_name_pt?: string
  product_name_en?: string
  generic_name?: string
  brands?: string
  quantity?: string
  categories?: string
}

type OpenFoodFactsResponse = {
  status?: number
  product?: OpenFoodFactsProduct
}

export type EanLinks = Record<string, string>

export type ProdutoOnlineEAN = {
  ean: string
  nome: string
  marca?: string
  quantidade?: string
  categoria?: string
  descricao?: string
  fonte: string
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
  'bebida',
  'bebidas',
  'alcoolica',
  'alcoolico',
  'adega',
  'un',
  'und',
  'ml',
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

function tokenizarNomeProduto(valor: unknown) {
  const base = normalizarTexto(valor)
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

  return tokens.filter((token) => token.length > 1 && !palavrasGenericas.has(token))
}

export function normalizarNomeProdutoParaEAN(valor: unknown) {
  return tokenizarNomeProduto(valor).join(' ')
}

function extrairVolumes(textoNormalizado: string) {
  return [...textoNormalizado.matchAll(/\b\d+(?:ml|l)\b/g)].map((match) => match[0])
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
  const nomeOnlineNormalizado = normalizarNomeProdutoParaEAN(
    [produtoOnline.nome, produtoOnline.marca, produtoOnline.quantidade].filter(Boolean).join(' '),
  )
  const nomeLocalNormalizado = normalizarNomeProdutoParaEAN(montarTextoComparacaoLocal(wine))
  const tokensOnline = nomeOnlineNormalizado.split(' ').filter(Boolean)
  const tokensLocal = nomeLocalNormalizado.split(' ').filter(Boolean)
  const tokensLocalSet = new Set(tokensLocal)
  const tokensOnlineSet = new Set(tokensOnline)
  const iguaisOnline = tokensOnline.filter((token) => tokensLocalSet.has(token)).length
  const iguaisLocal = tokensLocal.filter((token) => tokensOnlineSet.has(token)).length
  const coberturaOnline = tokensOnline.length > 0 ? iguaisOnline / tokensOnline.length : 0
  const coberturaLocal = tokensLocal.length > 0 ? iguaisLocal / Math.min(tokensLocal.length, 10) : 0
  const coberturaFuzzy = mediaSimilaridadeTokens(tokensOnline, tokensLocal)
  const volumesOnline = extrairVolumes(nomeOnlineNormalizado)
  const volumesLocal = extrairVolumes(nomeLocalNormalizado)
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
  const marcaOnlineNormalizada = normalizarNomeProdutoParaEAN(produtoOnline.marca)
  const marcaLocalNormalizada = normalizarNomeProdutoParaEAN(wine.marca)
  const marcaIgual =
    Boolean(marcaOnlineNormalizada) &&
    Boolean(marcaLocalNormalizada) &&
    mediaSimilaridadeTokens(
      marcaOnlineNormalizada.split(' ').filter(Boolean),
      marcaLocalNormalizada.split(' ').filter(Boolean),
    ) >= 0.72

  const pontuacao =
    coberturaOnline * 0.45 +
    coberturaFuzzy * 0.25 +
    coberturaLocal * 0.12 +
    (volumeIgual ? 0.1 : 0) +
    (categoriaIgual ? 0.05 : 0) +
    (marcaIgual ? 0.03 : 0)
  const score = Math.max(0, Math.min(100, Math.round(pontuacao * 100)))
  const motivos = [
    coberturaOnline >= 0.55 ? 'palavras principais parecidas' : undefined,
    coberturaFuzzy >= 0.65 ? 'termos aproximados encontrados' : undefined,
    volumeIgual ? 'volume igual' : undefined,
    categoriaIgual ? 'categoria compatível' : undefined,
    marcaIgual ? 'marca parecida' : undefined,
  ].filter((motivo): motivo is string => Boolean(motivo))

  return {
    score,
    classificacao: classificarScore(score),
    motivos,
    nomeNormalizadoLocal: nomeLocalNormalizado,
  }
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
  ].join(',')
  const url = `${baseUrl}/api/v2/product/${encodeURIComponent(ean)}.json?fields=${fields}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as OpenFoodFactsResponse

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

  return {
    ean,
    nome,
    marca: getCampoSeguro(data.product.brands, { maxLength: 120 }),
    quantidade: getCampoSeguro(data.product.quantity, { maxLength: 80 }),
    categoria: getCampoSeguro(data.product.categories, { maxLength: 180 }),
    fonte,
  } satisfies ProdutoOnlineEAN
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
  const response = await fetch(`/api/wireshape/registry/${montarCodigoWireshape(ean)}`, {
    headers: {
      Accept: 'text/html',
    },
  })

  if (!response.ok) {
    return null
  }

  const html = await response.text()
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

  return {
    ean,
    nome,
    marca,
    quantidade: extrairQuantidadeDeTexto(nome) ?? getCampoSeguro(product.weight, { maxLength: 80 }),
    categoria: getCampoSeguro(product.additionalType, { maxLength: 180 }),
    descricao,
    fonte: 'Wireshape Data',
  } satisfies ProdutoOnlineEAN
}

async function buscarProdutoOnlinePorEAN(ean: string) {
  const endpoints = [
    {
      baseUrl: 'https://world.openfoodfacts.org',
      fonte: 'Open Food Facts',
    },
    {
      baseUrl: 'https://world.openproductsfacts.org',
      fonte: 'Open Products Facts',
    },
  ]

  for (const endpoint of endpoints) {
    try {
      const produto = await consultarEndpointProduto(ean, endpoint.baseUrl, endpoint.fonte)

      if (produto) {
        return produto
      }
    } catch {
      // Tenta a proxima fonte antes de desistir.
    }
  }

  try {
    return await consultarWireshapePorEAN(ean)
  } catch {
    return null
  }
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
    const produtoOnline = await buscarProdutoOnlinePorEAN(eanNormalizado)
    console.log('Produto encontrado online:', produtoOnline)

    if (!produtoOnline) {
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
      [produtoOnline.nome, produtoOnline.marca, produtoOnline.quantidade].filter(Boolean).join(' '),
    )
    console.log('Nome normalizado online:', nomeNormalizadoOnline)
    console.log('Comparando com banco local...')

    const resultadosSimilares = vinhos
      .map((wine) => ({
        wine,
        ...calcularSimilaridadeProduto(produtoOnline, wine),
      }))
      .sort((a, b) => b.score - a.score)
      .filter((resultado) => resultado.score >= MIN_EAN_MATCH_SCORE)
      .slice(0, 12)

    console.log('Resultados similares:', resultadosSimilares)

    const melhorResultado = resultadosSimilares[0]

    return {
      status: 'comparacao',
      ean: eanNormalizado,
      produtoOnline,
      nomeNormalizadoOnline,
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
