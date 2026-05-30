import Fuse from 'fuse.js'
import type { Wine } from '../types/wine'

type CampoSeguroOptions = {
  maxLength?: number
  allowLong?: boolean
}

type SearchDocument = {
  wine: Wine
  index: number
  nome: string
  codigo: string
  codigosExatos: string[]
  marca: string
  tipoDeUva: string
  variedadeDaUva: string
}

export type CategoriaVinho = 'Todos' | 'Tinto' | 'Branco' | 'Espumante' | 'Rosé'
export type CategoriaFiltro = Exclude<CategoriaVinho, 'Todos'>
export type UvaFiltro =
  | 'Cabernet Sauvignon'
  | 'Merlot'
  | 'Malbec'
  | 'Chardonnay'
  | 'Sauvignon Blanc'
  | 'Tannat'
  | 'Pinot Noir'
  | 'Tempranillo'
  | 'Moscato'
  | 'Outros'
export type PaisFiltro =
  | 'Brasil'
  | 'Chile'
  | 'Argentina'
  | 'Portugal'
  | 'Itália'
  | 'Espanha'
  | 'França'
  | 'Uruguai'
  | 'Outros'
export type TeorAlcoolicoFiltro =
  | 'Até 10%'
  | '10% a 12%'
  | '12% a 14%'
  | 'Acima de 14%'
export type HarmonizacaoFiltro =
  | 'Carnes'
  | 'Massas'
  | 'Queijos'
  | 'Frutos do mar'
  | 'Sobremesas'
  | 'Aperitivos'

export type FiltrosAvancados = {
  cores: CategoriaFiltro[]
  uvas: UvaFiltro[]
  paises: PaisFiltro[]
  marcas: string[]
  teores: TeorAlcoolicoFiltro[]
  harmonizacoes: HarmonizacaoFiltro[]
}

export type OpcoesDeFiltro = {
  marcas: string[]
}

export type BuscaVinhosEstado =
  | 'destaques'
  | 'resultados'
  | 'codigo-incompleto'
  | 'codigo-sem-resultados'
  | 'nome-sem-resultados'

export type BuscaVinhosResultado = {
  vinhos: Wine[]
  estado: BuscaVinhosEstado
}

export const CATEGORIAS_RAPIDAS: CategoriaVinho[] = [
  'Todos',
  'Tinto',
  'Branco',
  'Espumante',
  'Rosé',
]

export const CORES_FILTRO: CategoriaFiltro[] = ['Tinto', 'Branco', 'Rosé', 'Espumante']

export const UVAS_FILTRO: UvaFiltro[] = [
  'Cabernet Sauvignon',
  'Merlot',
  'Malbec',
  'Chardonnay',
  'Sauvignon Blanc',
  'Tannat',
  'Pinot Noir',
  'Tempranillo',
  'Moscato',
  'Outros',
]

export const PAISES_FILTRO: PaisFiltro[] = [
  'Brasil',
  'Chile',
  'Argentina',
  'Portugal',
  'Itália',
  'Espanha',
  'França',
  'Uruguai',
  'Outros',
]

export const TEORES_FILTRO: TeorAlcoolicoFiltro[] = [
  'Até 10%',
  '10% a 12%',
  '12% a 14%',
  'Acima de 14%',
]

export const HARMONIZACOES_FILTRO: HarmonizacaoFiltro[] = [
  'Carnes',
  'Massas',
  'Queijos',
  'Frutos do mar',
  'Sobremesas',
  'Aperitivos',
]

export const filtrosAvancadosVazios: FiltrosAvancados = {
  cores: [],
  uvas: [],
  paises: [],
  marcas: [],
  teores: [],
  harmonizacoes: [],
}

const valoresVazios = new Set(['', '-', '--', 'null', 'undefined', 'n/a', 'na'])

const marcadoresRuido = [
  'Formato de Venda',
  'Canal Exclusivo',
  'Quantidade de Kits',
  'Condição do Item',
  'Unidades Por Kit',
  'Garantia',
  'Elaboração',
  'Informações Adicionais',
  'Característica Geral',
  'Altura (cm)',
  'Largura (cm)',
  'Profundidade (cm)',
  'CaracterísticasHarmonização',
  'Temperatura Ideal',
  'Região:',
  'Regiao:',
  'Produtor:',
  'Uva(s):',
  'Varietal:',
  'Adega:',
]

const marcadoresFiltroRuim = [
  'politica',
  'política',
  'rodape',
  'rodapé',
  'mapa do site',
  'copyright',
  'todos os direitos',
  'caracteristicas',
  'características',
  'formato de venda',
  'condicao do item',
  'condição do item',
]

const uvasNormalizadas: Record<Exclude<UvaFiltro, 'Outros'>, string[]> = {
  'Cabernet Sauvignon': ['cabernet sauvignon', 'cabernet'],
  Merlot: ['merlot'],
  Malbec: ['malbec'],
  Chardonnay: ['chardonnay'],
  'Sauvignon Blanc': ['sauvignon blanc'],
  Tannat: ['tannat'],
  'Pinot Noir': ['pinot noir', 'pinot'],
  Tempranillo: ['tempranillo'],
  Moscato: ['moscato', 'moscatel', 'moscato bianco'],
}

const paisesNormalizados: Record<Exclude<PaisFiltro, 'Outros'>, string[]> = {
  Brasil: ['brasil', 'brasileiro', 'brasileira'],
  Chile: ['chile', 'chileno', 'chilena'],
  Argentina: ['argentina', 'argentino', 'argentina'],
  Portugal: ['portugal', 'portugues', 'portuguesa'],
  Itália: ['italia', 'italiano', 'italiana'],
  Espanha: ['espanha', 'espanhol', 'espanhola'],
  França: ['franca', 'frances', 'francesa'],
  Uruguai: ['uruguai', 'uruguaio', 'uruguaia'],
}

const harmonizacoesNormalizadas: Record<HarmonizacaoFiltro, string[]> = {
  Carnes: ['carne', 'carnes', 'bife', 'costela', 'cordeiro', 'churrasco'],
  Massas: ['massa', 'massas', 'macarrao', 'risoto', 'lasanha'],
  Queijos: ['queijo', 'queijos', 'gorgonzola', 'brie', 'parmesao', 'cheddar'],
  'Frutos do mar': [
    'frutos do mar',
    'peixe',
    'peixes',
    'pescado',
    'marisco',
    'camarao',
    'lagosta',
    'ostra',
    'ostras',
  ],
  Sobremesas: ['sobremesa', 'sobremesas', 'doce', 'doces', 'torta', 'mousse', 'sorvete'],
  Aperitivos: ['aperitivo', 'aperitivos', 'entrada', 'entradas', 'petisco', 'salada'],
}

function corrigirMojibake(texto: string) {
  if (!/[ÃÂ]/.test(texto)) {
    return texto
  }

  try {
    const bytes = Uint8Array.from(Array.from(texto), (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return texto
  }
}

function removerRuido(texto: string) {
  const textoBusca = texto.toLowerCase()
  const primeiroMarcador = marcadoresRuido
    .map((marcador) => textoBusca.indexOf(marcador.toLowerCase()))
    .filter((indice) => indice > 1)
    .sort((a, b) => a - b)[0]

  return primeiroMarcador ? texto.slice(0, primeiroMarcador) : texto
}

export function getCampoSeguro(valor: unknown, options: CampoSeguroOptions = {}) {
  if (valor === null || valor === undefined) {
    return undefined
  }

  const bruto = Array.isArray(valor) ? valor.join(', ') : String(valor)
  const limpo = removerRuido(corrigirMojibake(bruto))
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:%])/g, '$1')
    .trim()

  if (valoresVazios.has(limpo.toLowerCase())) {
    return undefined
  }

  if (!options.allowLong && options.maxLength && limpo.length > options.maxLength) {
    return `${limpo.slice(0, options.maxLength).trim()}...`
  }

  return limpo
}

export function normalizarTexto(valor: unknown) {
  return (getCampoSeguro(valor, { allowLong: true }) ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizarCodigo(valor: unknown) {
  return (getCampoSeguro(valor, { allowLong: true }) ?? '').replace(/\D/g, '')
}

export function isCampoSeguro(valor: unknown, maxLength = 80) {
  const campo = getCampoSeguro(valor, { allowLong: true })

  if (!campo || campo.length > maxLength) {
    return false
  }

  const normalizado = normalizarTexto(campo)
  return !marcadoresFiltroRuim.some((marcador) => normalizado.includes(normalizarTexto(marcador)))
}

function criarDocumentoBusca(wine: Wine, index: number): SearchDocument {
  const codigosExatos = [
    wine.codigo_produto,
    wine.ean,
    wine.gtin,
    wine.codigo_ean,
    wine.codigo_barras,
    wine.codigo_de_barras,
  ]
    .map(normalizarCodigo)
    .filter(Boolean)

  return {
    wine,
    index,
    nome: normalizarTexto(wine.nome_produto),
    codigo: normalizarCodigo(wine.codigo_produto),
    codigosExatos: [...new Set(codigosExatos)],
    marca: normalizarTexto(wine.marca),
    tipoDeUva: normalizarTexto(wine.tipo_de_uva),
    variedadeDaUva: normalizarTexto(wine.variedade_da_uva),
  }
}

function pontuarCorrespondenciaNome(documento: SearchDocument, termo: string) {
  if (documento.nome === termo) return 0
  if (documento.nome.startsWith(termo)) return 1
  if (documento.marca.startsWith(termo)) return 2
  if (documento.nome.includes(termo)) return 3
  if (documento.tipoDeUva.includes(termo)) return 4
  if (documento.variedadeDaUva.includes(termo)) return 5
  if (documento.marca.includes(termo)) return 6
  return 7
}

function detectarCategoriasNoTexto(texto: string) {
  const categorias = new Set<CategoriaFiltro>()

  if (/\b(espumante|cava)\b/.test(texto)) categorias.add('Espumante')
  if (/\b(rose|rosado|rosada)\b/.test(texto)) categorias.add('Rosé')
  if (/\btinto\b/.test(texto)) categorias.add('Tinto')
  if (/\bbranco\b/.test(texto)) categorias.add('Branco')

  return [...categorias]
}

export function detectarCategoriaVinho(wine: Wine) {
  const categoriasNome = detectarCategoriasNoTexto(normalizarTexto(wine.nome_produto))

  if (categoriasNome.length > 0) {
    return categoriasNome
  }

  const categoriasTipo = detectarCategoriasNoTexto(normalizarTexto(wine.tipo))

  if (categoriasTipo.length > 0) {
    return categoriasTipo
  }

  return detectarCategoriasNoTexto(normalizarTexto(wine.cor_do_vinho))
}

export function filtrarPorCategoria(vinhos: Wine[], categoria: CategoriaVinho) {
  if (categoria === 'Todos') {
    return vinhos
  }

  return vinhos.filter((wine) => detectarCategoriaVinho(wine).includes(categoria))
}

function textoUva(wine: Wine) {
  return normalizarTexto(
    [wine.tipo_de_uva, wine.variedade_da_uva, wine.nome_produto].filter(Boolean).join(' '),
  )
}

function detectarUvas(wine: Wine) {
  const texto = textoUva(wine)

  return Object.entries(uvasNormalizadas)
    .filter(([, termos]) => termos.some((termo) => texto.includes(termo)))
    .map(([uva]) => uva as Exclude<UvaFiltro, 'Outros'>)
}

function detectarPaises(wine: Wine) {
  const texto = normalizarTexto([wine.pais_de_origem, wine.nome_produto].filter(Boolean).join(' '))

  return Object.entries(paisesNormalizados)
    .filter(([, termos]) => termos.some((termo) => texto.includes(termo)))
    .map(([pais]) => pais as Exclude<PaisFiltro, 'Outros'>)
}

function extrairTeorAlcoolico(wine: Wine) {
  const texto = getCampoSeguro(wine.teor_alcoolico, { allowLong: true })
  const match = texto?.match(/(\d+(?:[,.]\d+)?)/)

  return match ? Number(match[1].replace(',', '.')) : undefined
}

function matchTeorAlcoolico(wine: Wine, filtros: TeorAlcoolicoFiltro[]) {
  if (filtros.length === 0) {
    return true
  }

  const teor = extrairTeorAlcoolico(wine)

  if (teor === undefined || Number.isNaN(teor)) {
    return false
  }

  return filtros.some((filtro) => {
    if (filtro === 'Até 10%') return teor <= 10
    if (filtro === '10% a 12%') return teor > 10 && teor <= 12
    if (filtro === '12% a 14%') return teor > 12 && teor <= 14
    return teor > 14
  })
}

function matchHarmonizacao(wine: Wine, filtros: HarmonizacaoFiltro[]) {
  if (filtros.length === 0) {
    return true
  }

  const texto = normalizarTexto(wine.harmonizacao)

  return filtros.some((filtro) =>
    harmonizacoesNormalizadas[filtro].some((termo) => texto.includes(termo)),
  )
}

function matchUvas(wine: Wine, filtros: UvaFiltro[]) {
  if (filtros.length === 0) {
    return true
  }

  const uvas = detectarUvas(wine)
  const temUvaConhecida = uvas.length > 0

  return filtros.some((filtro) => {
    if (filtro === 'Outros') {
      return !temUvaConhecida
    }

    return uvas.includes(filtro)
  })
}

function matchPaises(wine: Wine, filtros: PaisFiltro[]) {
  if (filtros.length === 0) {
    return true
  }

  const paises = detectarPaises(wine)
  const temPaisConhecido = paises.length > 0

  return filtros.some((filtro) => {
    if (filtro === 'Outros') {
      return !temPaisConhecido
    }

    return paises.includes(filtro)
  })
}

function matchMarcas(wine: Wine, filtros: string[]) {
  if (filtros.length === 0) {
    return true
  }

  const marca = normalizarTexto(wine.marca)
  return filtros.some((filtro) => marca === normalizarTexto(filtro))
}

function matchCores(wine: Wine, filtros: CategoriaFiltro[]) {
  if (filtros.length === 0) {
    return true
  }

  const categorias = detectarCategoriaVinho(wine)
  return filtros.some((filtro) => categorias.includes(filtro))
}

export function aplicarFiltrosAvancados(vinhos: Wine[], filtros: FiltrosAvancados) {
  return vinhos.filter(
    (wine) =>
      matchCores(wine, filtros.cores) &&
      matchUvas(wine, filtros.uvas) &&
      matchPaises(wine, filtros.paises) &&
      matchMarcas(wine, filtros.marcas) &&
      matchTeorAlcoolico(wine, filtros.teores) &&
      matchHarmonizacao(wine, filtros.harmonizacoes),
  )
}

export function temFiltrosAvancadosAtivos(filtros: FiltrosAvancados) {
  return Object.values(filtros).some((valores) => valores.length > 0)
}

export function getOpcoesDeFiltro(vinhos: Wine[]): OpcoesDeFiltro {
  const marcas = vinhos
    .map((wine) => getCampoSeguro(wine.marca, { allowLong: true }))
    .filter((marca): marca is string => Boolean(marca && isCampoSeguro(marca, 60)))

  return {
    marcas: [...new Set(marcas)].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }
}

export function buscarVinhos(vinhos: Wine[], termo: string) {
  const termoNormalizado = normalizarTexto(termo)
  const documentos = vinhos
    .map(criarDocumentoBusca)
    .filter((documento) => documento.nome || documento.codigosExatos.length > 0)

  if (!termoNormalizado) {
    return {
      vinhos: documentos.map((documento) => documento.wine),
      estado: 'destaques',
    } satisfies BuscaVinhosResultado
  }

  const buscaNumerica = /^\d+$/.test(termoNormalizado)

  if (buscaNumerica) {
    const vinhoExato = documentos.find((documento) =>
      documento.codigosExatos.includes(termoNormalizado),
    )
    const temCodigoComecandoComTermo = documentos.some((documento) =>
      documento.codigosExatos.some((codigo) => codigo.startsWith(termoNormalizado)),
    )
    const pareceEanCompleto =
      /^\d{8}$/.test(termoNormalizado) || /^\d{12,14}$/.test(termoNormalizado)

    return {
      vinhos: vinhoExato ? [vinhoExato.wine] : [],
      estado: vinhoExato
        ? 'resultados'
        : !temCodigoComecandoComTermo && pareceEanCompleto
          ? 'codigo-sem-resultados'
          : 'codigo-incompleto',
    } satisfies BuscaVinhosResultado
  }

  const camposBusca = (documento: SearchDocument) => [
    documento.nome,
    documento.marca,
    documento.tipoDeUva,
    documento.variedadeDaUva,
  ]

  const correspondenciasDiretas = documentos
    .filter((documento) => camposBusca(documento).some((campo) => campo.includes(termoNormalizado)))
    .sort((a, b) => {
      const diferencaPontuacao =
        pontuarCorrespondenciaNome(a, termoNormalizado) -
        pontuarCorrespondenciaNome(b, termoNormalizado)

      return diferencaPontuacao || a.index - b.index
    })

  const tamanhoBusca = termoNormalizado.length
  const usarFuse = tamanhoBusca >= 3
  const threshold = tamanhoBusca <= 3 ? 0.34 : tamanhoBusca <= 5 ? 0.3 : 0.27
  const scoreMaximo = tamanhoBusca <= 3 ? 0.3 : tamanhoBusca <= 5 ? 0.24 : 0.2
  const minMatchCharLength = tamanhoBusca <= 3 ? 3 : Math.min(tamanhoBusca - 1, 6)

  const fuse = new Fuse(documentos, {
    keys: [
      { name: 'nome', weight: 0.68 },
      { name: 'marca', weight: 0.16 },
      { name: 'tipoDeUva', weight: 0.09 },
      { name: 'variedadeDaUva', weight: 0.07 },
    ],
    threshold,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength,
  })

  const resultadosFuse = usarFuse
    ? fuse
        .search(termoNormalizado)
        .filter((item) => (item.score ?? 1) <= scoreMaximo)
        .map((item) => item.item)
    : []

  const vistos = new Set<Wine>()
  const resultados = [...correspondenciasDiretas, ...resultadosFuse]
    .filter((documento) => {
      if (vistos.has(documento.wine)) {
        return false
      }

      vistos.add(documento.wine)
      return true
    })
    .map((documento) => documento.wine)

  return {
    vinhos: resultados,
    estado: resultados.length > 0 ? 'resultados' : 'nome-sem-resultados',
  } satisfies BuscaVinhosResultado
}

export function getUvaPreferida(wine: Wine) {
  return (
    getCampoSeguro(wine.tipo_de_uva, { maxLength: 140 }) ??
    getCampoSeguro(wine.variedade_da_uva, { maxLength: 140 })
  )
}

export function getImagensValidas(wine: Wine) {
  const imagens = [
    getCampoSeguro(wine.imagem_principal, { maxLength: 600 }),
    ...(Array.isArray(wine.imagens_extras)
      ? wine.imagens_extras.map((imagem) => getCampoSeguro(imagem, { maxLength: 600 }))
      : []),
  ]

  return [...new Set(imagens.filter((imagem): imagem is string => Boolean(imagem)))]
}

export async function copiarCodigo(codigo: unknown) {
  const codigoSeguro = getCampoSeguro(codigo, { maxLength: 80 })

  if (!codigoSeguro) {
    return false
  }

  try {
    await navigator.clipboard.writeText(codigoSeguro)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = codigoSeguro
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copiado = document.execCommand('copy')
    document.body.removeChild(area)
    return copiado
  }
}
