const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
}

const SOURCE_TIMEOUT_MS = 7000

const PRODUTOS_EAN_CONFIRMADOS = [
  {
    fonte: 'Base confirmada AdegaZ',
    ean: '7804330001736',
    nome: 'Vinho Tinto Chileno 120 Red Blend 750ml',
    marca: '120',
    quantidade: '750ml',
    categoria: 'Vinho tinto chileno red blend',
    descricao:
      'Produto confirmado como Santa Rita 120 Reserva Especial Red Blend 750ml, Chile, Valle Central, Cabernet Franc, Cabernet Sauvignon e Carmenere.',
    confiancaFonte: 0.97,
  },
]

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  })
}

function normalizarEAN(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function isValidEAN(value) {
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(normalizarEAN(value))
}

function safeString(value, maxLength = 240) {
  if (value === null || value === undefined) {
    return undefined
  }

  const text = Array.isArray(value) ? value.find(Boolean) : String(value)
  const clean = String(text).replace(/\s+/g, ' ').trim()

  if (!clean || clean === '-' || clean.toLowerCase() === 'null') {
    return undefined
  }

  return clean.length > maxLength ? `${clean.slice(0, maxLength).trim()}...` : clean
}

function normalizarTexto(value) {
  return safeString(value, 1000)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() ?? ''
}

function normalizarProduto(produto, fallbackConfidence) {
  const ean = normalizarEAN(produto.ean)
  const nome = safeString(produto.nome ?? produto.name ?? produto.title, 220)
  const fonte = safeString(produto.fonte ?? produto.source, 80)

  if (!isValidEAN(ean) || !nome || !fonte) {
    return null
  }

  const confidence =
    typeof produto.confiancaFonte === 'number' && Number.isFinite(produto.confiancaFonte)
      ? produto.confiancaFonte
      : fallbackConfidence

  return {
    fonte,
    ean,
    nome,
    marca: safeString(produto.marca ?? produto.brand, 120),
    imagem: getImagemSegura(produto.imagem ?? produto.image ?? produto.imageUrl),
    quantidade: safeString(produto.quantidade ?? produto.size ?? produto.quantity, 80),
    categoria: safeString(produto.categoria ?? produto.category, 180),
    descricao: safeString(produto.descricao ?? produto.description, 500),
    confiancaFonte: Math.max(0, Math.min(1, confidence)),
  }
}

function getImagemSegura(value) {
  if (Array.isArray(value)) {
    return value.map(getImagemSegura).find(Boolean)
  }

  if (value && typeof value === 'object') {
    return safeString(value.url ?? value.contentUrl, 600)
  }

  return safeString(value, 600)
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AdegaZ-EAN-Proxy/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchText(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AdegaZ-EAN-Proxy/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function getJsonLdItems(value) {
  if (Array.isArray(value)) {
    return value.flatMap(getJsonLdItems)
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  const nested = value['@graph'] ? getJsonLdItems(value['@graph']) : []
  return [value, ...nested]
}

function getJsonLdTypes(item) {
  const type = item?.['@type']

  if (Array.isArray(type)) {
    return type.filter((entry) => typeof entry === 'string')
  }

  return typeof type === 'string' ? [type] : []
}

function extractJsonLdProducts(html) {
  const matches = html.matchAll(
    /<script[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi,
  )
  const products = []

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim())
      products.push(
        ...getJsonLdItems(parsed).filter((item) =>
          getJsonLdTypes(item).some((type) => type.toLowerCase() === 'product'),
        ),
      )
    } catch {
      // HTML externo pode ter JSON-LD invalido. Tentamos o proximo bloco.
    }
  }

  return products
}

function getBrandName(value) {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    return value.name
  }

  return undefined
}

function detectarMarcaConhecida(texto) {
  const normalizado = normalizarTexto(texto)

  if (normalizado.includes('club des sommeliers') || normalizado.includes('clube des sommeliers')) {
    return 'Club Des Sommeliers'
  }

  return undefined
}

function extrairQuantidade(texto) {
  return safeString(texto)?.match(/\b\d+\s*(?:ml|l)\b/i)?.[0]?.replace(/\s+/g, '')
}

function montarCodigoWireshape(ean) {
  return `0x${ean.padStart(64, '0')}`
}

async function consultarWireshape(ean) {
  const html = await fetchText(`https://data.wireshape.com/registry/${montarCodigoWireshape(ean)}`)
  const product = extractJsonLdProducts(html)[0]

  if (!product) {
    return []
  }

  const nome = safeString(product.name, 220)
  const descricao = safeString(product.description, 500)
  const textoCompleto = [nome, descricao].filter(Boolean).join(' ')
  const marca = detectarMarcaConhecida(textoCompleto) ?? safeString(getBrandName(product.brand), 120)

  return [
    normalizarProduto(
      {
        fonte: 'Wireshape Data',
        ean,
        nome,
        marca,
        imagem: product.image,
        quantidade: extrairQuantidade(nome) ?? product.weight,
        categoria: product.additionalType,
        descricao,
        confiancaFonte: 0.9,
      },
      0.9,
    ),
  ].filter(Boolean)
}

async function consultarUpcItemDb(ean) {
  const data = await fetchJson(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(ean)}`)

  if (data?.code !== 'OK' || !Array.isArray(data.items)) {
    return []
  }

  return data.items
    .map((item) =>
      normalizarProduto(
        {
          fonte: 'UPCitemdb',
          ean,
          nome: item.title ?? item.description,
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
    .filter(Boolean)
}

async function consultarOpenFacts(ean, baseUrl, fonte) {
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
  const data = await fetchJson(`${baseUrl}/api/v2/product/${encodeURIComponent(ean)}.json?fields=${fields}`)

  if (data?.status !== 1 || !data.product) {
    return []
  }

  const product = data.product
  const nome =
    product.product_name_pt ??
    product.product_name ??
    product.product_name_en ??
    product.generic_name

  return [
    normalizarProduto(
      {
        fonte,
        ean,
        nome,
        marca: product.brands,
        imagem: product.image_url,
        quantidade: product.quantity,
        categoria: product.categories,
        confiancaFonte: 0.74,
      },
      0.74,
    ),
  ].filter(Boolean)
}

function consultarBaseConfirmada(ean) {
  return PRODUTOS_EAN_CONFIRMADOS
    .filter((produto) => normalizarEAN(produto.ean) === ean)
    .map((produto) => normalizarProduto(produto, 0.97))
    .filter(Boolean)
}

function deduplicarProdutos(produtos) {
  const byKey = new Map()

  for (const produto of produtos) {
    const key = normalizarTexto([produto.nome, produto.marca].filter(Boolean).join(' ')) || `${produto.ean}:${produto.fonte}`
    const current = byKey.get(key)

    if (
      !current ||
      produto.confiancaFonte > current.confiancaFonte ||
      (!current.imagem && produto.imagem)
    ) {
      byKey.set(key, produto)
    }
  }

  return [...byKey.values()].sort((a, b) => {
    if (Boolean(a.imagem) !== Boolean(b.imagem)) {
      return a.imagem ? -1 : 1
    }

    return b.confiancaFonte - a.confiancaFonte
  })
}

async function buscarProdutoPorEAN(ean) {
  const fontes = [
    () => Promise.resolve(consultarBaseConfirmada(ean)),
    () => consultarWireshape(ean),
    () => consultarUpcItemDb(ean),
    () => consultarOpenFacts(ean, 'https://world.openfoodfacts.org', 'Open Food Facts'),
    () => consultarOpenFacts(ean, 'https://world.openproductsfacts.org', 'Open Products Facts'),
  ]
  const settled = await Promise.allSettled(fontes.map((fonte) => fonte()))

  return deduplicarProdutos(
    settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
  )
}

async function getCachedResponse(request, ean) {
  if (typeof caches === 'undefined') {
    return null
  }

  return await caches.default.match(new Request(new URL(`/?ean=${ean}`, request.url)))
}

async function putCachedResponse(request, ean, response) {
  if (typeof caches === 'undefined') {
    return
  }

  const cacheKey = new Request(new URL(`/?ean=${ean}`, request.url))
  await caches.default.put(cacheKey, response.clone())
}

export default {
  async fetch(request, _env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      })
    }

    if (request.method !== 'GET') {
      return jsonResponse({ erro: 'Metodo nao permitido.' }, 405)
    }

    const url = new URL(request.url)
    const ean = normalizarEAN(url.searchParams.get('ean') ?? url.pathname.split('/').filter(Boolean).at(-1))

    if (!isValidEAN(ean)) {
      return jsonResponse({ erro: 'EAN/GTIN/UPC invalido.', resultados: [] }, 400)
    }

    const cached = await getCachedResponse(request, ean)

    if (cached) {
      return cached
    }

    const resultados = await buscarProdutoPorEAN(ean)
    const response = jsonResponse({
      ean,
      resultados,
      fontesTentadas: [
        'Base confirmada AdegaZ',
        'Wireshape Data',
        'UPCitemdb',
        'Open Food Facts',
        'Open Products Facts',
      ],
    })

    ctx?.waitUntil?.(putCachedResponse(request, ean, response))
    return response
  },
}
