import {
  AlertTriangle,
  BadgeCheck,
  Barcode,
  CheckCircle2,
  Loader2,
  SearchCheck,
  Wine as WineIcon,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { Wine } from '../types/wine'
import type { EanResolutionState, ResultadoSimilarEAN } from '../utils/eanUtils'
import { getCampoSeguro } from '../utils/wineUtils'

type EanMatchPanelProps = {
  result: EanResolutionState
  onSelectWine: (wine: Wine) => void
  onClear: () => void
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'provável produto correspondente'
  if (score >= 70) return 'produto parecido, conferir manualmente'
  return 'nenhum produto acima de 70% encontrado'
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
      : score >= 70
        ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
        : 'border-white/10 bg-white/[0.05] text-stone-300'

  return (
    <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${color}`}>
      {score}%
    </span>
  )
}

function StatusHeader({ result }: { result: EanResolutionState }) {
  if (result.status === 'carregando') {
    return {
      icon: Loader2,
      title: 'Buscando informações do EAN na internet...',
      description: 'Consultando fontes externas e preparando a comparação com a adega local.',
    }
  }

  if (result.status === 'online-sem-produto') {
    return {
      icon: AlertTriangle,
      title: 'EAN não encontrado em bases externas.',
      description: 'Tente pesquisar pelo nome do vinho.',
    }
  }

  if (result.status === 'erro') {
    return {
      icon: AlertTriangle,
      title: 'Erro na consulta online.',
      description: result.mensagem,
    }
  }

  if (result.status === 'vinculado') {
    return {
      icon: CheckCircle2,
      title: 'EAN vinculado com sucesso.',
      description: 'Nas próximas leituras, esse código abrirá o produto local diretamente.',
    }
  }

  if (result.status === 'local') {
    return {
      icon: BadgeCheck,
      title: 'Produto encontrado pelo EAN local.',
      description: 'Esse código já está vinculado a um vinho da sua base.',
    }
  }

  const melhorScore = result.melhorResultado?.score ?? 0

  if (result.status === 'comparacao' && melhorScore < 70) {
    return {
      icon: AlertTriangle,
      title: 'EAN encontrado na internet.',
      description:
        'Encontramos o EAN na internet, mas nenhum vinho cadastrado ficou parecido o suficiente.',
    }
  }

  return {
    icon: SearchCheck,
    title: getScoreLabel(melhorScore),
    description:
      melhorScore >= 70
        ? 'Mostrando apenas candidatos com similaridade de 70% ou mais.'
        : 'Nenhum candidato passou do limite mínimo de 70%.',
  }
}

function CandidateImage({ src, alt }: { src?: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>()
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-b from-garnet/25 to-graphite text-brass">
        <WineIcon size={34} strokeWidth={1.4} aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain"
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}

function Candidate({
  match,
  index,
  onSelectWine,
}: {
  match: ResultadoSimilarEAN
  index: number
  onSelectWine: (wine: Wine) => void
}) {
  const nome = getCampoSeguro(match.wine.nome_produto, { maxLength: 180 }) ?? 'Vinho sem nome'
  const codigo = getCampoSeguro(match.wine.codigo_produto, { maxLength: 80 })
  const marca = getCampoSeguro(match.wine.marca, { maxLength: 80 })
  const imagem = getCampoSeguro(match.wine.imagem_principal, { maxLength: 600 })
  const isBest = index === 0

  return (
    <article
      className={`rounded-lg border p-3 transition duration-200 sm:p-4 ${
        isBest
          ? 'border-brass/50 bg-brass/10 shadow-glow'
          : 'border-white/10 bg-white/[0.045] hover:border-brass/35'
      }`}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-[112px_1fr]">
        <div className="aspect-[4/5] w-full max-w-28 justify-self-center overflow-hidden rounded-md bg-graphite/70 p-2 sm:max-w-none sm:p-3">
          <CandidateImage src={imagem} alt={nome} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isBest ? (
              <span className="rounded-full border border-brass/40 bg-graphite px-2 py-0.5 text-xs font-bold uppercase text-brass">
                Melhor resultado
              </span>
            ) : null}
            <ScorePill score={match.score} />
          </div>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-6 text-ivory">
            {nome}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-400">
            {codigo ? <span>Código {codigo}</span> : null}
            {marca ? <span>{marca}</span> : null}
          </div>
          {match.motivos.length > 0 ? (
            <p className="mt-3 text-xs leading-5 text-stone-300">
              {match.motivos.join(' • ')}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => onSelectWine(match.wine)}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-brass/40 bg-brass/10 px-4 text-sm font-semibold text-brass transition duration-200 hover:bg-brass hover:text-graphite focus:outline-none focus:ring-2 focus:ring-brass/60 sm:w-auto"
          >
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  )
}

export function EanMatchPanel({ result, onSelectWine, onClear }: EanMatchPanelProps) {
  const status = StatusHeader({ result })
  const Icon = status.icon
  const isLoading = result.status === 'carregando'

  return (
    <section className="mb-8 animate-fade-in rounded-lg border border-brass/25 bg-[#151217]/90 p-4 text-left shadow-cellar sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brass/35 bg-brass/10 text-brass sm:h-11 sm:w-11">
            <Icon
              size={22}
              className={isLoading ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ivory sm:text-lg">{status.title}</h2>
            <p className="mt-1 text-sm leading-6 text-stone-300">{status.description}</p>
            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-stone-300">
              <Barcode size={14} className="shrink-0 text-brass" aria-hidden="true" />
              <span className="truncate">EAN lido: {result.ean}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-stone-300 transition duration-200 hover:border-brass/45 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
          aria-label="Fechar resultado do EAN"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {result.status === 'comparacao' ? (
        <>
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="flex gap-3">
              {result.produtoOnline.imagem ? (
                <span className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white p-1.5">
                  <CandidateImage
                    src={result.produtoOnline.imagem}
                    alt={result.produtoOnline.nome}
                  />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brass">
                  Produto encontrado online
                </p>
                <p className="mt-2 text-base font-semibold text-ivory">
                  {result.produtoOnline.nome}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-400">
                  {result.produtoOnline.marca ? <span>{result.produtoOnline.marca}</span> : null}
                  {result.produtoOnline.quantidade ? (
                    <span>{result.produtoOnline.quantidade}</span>
                  ) : null}
                  <span>{result.produtoOnline.fonte}</span>
                  <span>{Math.round(result.produtoOnline.confiancaFonte * 100)}% fonte</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {result.resultadosSimilares.length > 0 ? (
              result.resultadosSimilares.map((match, index) => (
                <Candidate
                  key={`${getCampoSeguro(match.wine.codigo_produto, { maxLength: 80 }) ?? index}`}
                  match={match}
                  index={index}
                  onSelectWine={onSelectWine}
                />
              ))
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm text-stone-300">
                Encontramos o EAN na internet, mas nenhum vinho cadastrado ficou parecido o suficiente.
              </p>
            )}
          </div>
        </>
      ) : null}

      {result.status === 'vinculado' || result.status === 'local' ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass">
            Produto local
          </p>
          <p className="mt-2 text-base font-semibold text-ivory">
            {getCampoSeguro(result.vinho.nome_produto, { maxLength: 180 }) ?? 'Vinho sem nome'}
          </p>
          <button
            type="button"
            onClick={() => onSelectWine(result.vinho)}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-brass/40 bg-brass/10 px-4 text-sm font-semibold text-brass transition duration-200 hover:bg-brass hover:text-graphite focus:outline-none focus:ring-2 focus:ring-brass/60"
          >
            Ver detalhes
          </button>
        </div>
      ) : null}
    </section>
  )
}
