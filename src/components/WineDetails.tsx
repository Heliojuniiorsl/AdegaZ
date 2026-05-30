import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Barcode,
  BottleWine,
  Copy,
  ExternalLink,
  Factory,
  Grape,
  MapPin,
  Palette,
  Sparkles,
  Thermometer,
  Wine,
} from 'lucide-react'
import type { Wine as WineType } from '../types/wine'
import {
  copiarCodigo,
  getCampoSeguro,
  getImagensValidas,
  getUvaPreferida,
} from '../utils/wineUtils'
import { ImageGallery } from './ImageGallery'
import { InfoItem } from './InfoItem'

type WineDetailsProps = {
  wine: WineType
  onBack: () => void
}

function ReadMoreText({ value, limit = 360 }: { value: unknown; limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  const texto = getCampoSeguro(value, { maxLength: 2800 })

  if (!texto) {
    return null
  }

  const canExpand = texto.length > limit
  const visibleText = canExpand && !expanded ? `${texto.slice(0, limit).trim()}...` : texto

  return (
    <div>
      <p className="text-sm leading-7 text-stone-300">{visibleText}</p>
      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 text-sm font-semibold text-brass hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-brass/60"
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </div>
  )
}

function TextSection({
  title,
  value,
  icon,
}: {
  title: string
  value: unknown
  icon: ReactNode
}) {
  const texto = getCampoSeguro(value, { maxLength: 2800 })

  if (!texto) {
    return null
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-cellar">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ivory">
        <span className="text-brass">{icon}</span>
        {title}
      </h2>
      <ReadMoreText value={texto} />
    </section>
  )
}

export function WineDetails({ wine, onBack }: WineDetailsProps) {
  const [copied, setCopied] = useState(false)
  const imagens = useMemo(() => getImagensValidas(wine), [wine])
  const nome = getCampoSeguro(wine.nome_produto, { maxLength: 220 }) ?? 'Vinho selecionado'
  const codigo = getCampoSeguro(wine.codigo_produto, { maxLength: 80 })
  const link = getCampoSeguro(wine.link_produto, { maxLength: 700 })
  const conservacao = [
    getCampoSeguro(wine.tipo_de_armazenagem, { maxLength: 180 }),
    getCampoSeguro(wine.tipo_de_armazenagem_apos_aberto, { maxLength: 180 }),
    getCampoSeguro(wine.informacoes_de_conservacao, { maxLength: 500 }),
  ].some(Boolean)

  async function handleCopy() {
    const success = await copiarCodigo(wine.codigo_produto)

    if (success) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl animate-fade-in px-4 pb-12 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar
      </button>

      <div className="grid gap-8 md:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.15fr)] md:items-start">
        <ImageGallery images={imagens} alt={nome} />

        <section className="space-y-6">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-xs font-semibold uppercase text-brass">
              <BottleWine size={14} aria-hidden="true" />
              Seleção da adega
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-ivory sm:text-4xl">
              {nome}
            </h1>
            {codigo ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-stone-400">
                <Barcode size={16} className="text-brass" aria-hidden="true" />
                Código do produto {codigo}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {link?.startsWith('http') ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brass px-5 py-3 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-brass/70"
              >
                Ver no Pão de Açúcar
                <ExternalLink size={17} aria-hidden="true" />
              </a>
            ) : null}
            {codigo ? (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.07] px-5 py-3 text-sm font-bold text-ivory transition duration-200 hover:border-brass/50 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/70"
              >
                <Copy size={17} aria-hidden="true" />
                {copied ? 'Código copiado' : 'Copiar código'}
              </button>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Marca" value={wine.marca} icon={<BadgeCheck size={14} />} />
            <InfoItem label="Produtor" value={wine.produtor} icon={<Factory size={14} />} />
            <InfoItem label="Tipo" value={wine.tipo} icon={<Wine size={14} />} />
            <InfoItem label="Cor do vinho" value={wine.cor_do_vinho} icon={<Palette size={14} />} />
            <InfoItem
              label="País de origem"
              value={wine.pais_de_origem}
              icon={<MapPin size={14} />}
            />
            <InfoItem label="Região" value={wine.regiao} icon={<MapPin size={14} />} />
            <InfoItem label="Tipo de uva" value={getUvaPreferida(wine)} icon={<Grape size={14} />} />
            <InfoItem
              label="Variedade da uva"
              value={wine.variedade_da_uva}
              icon={<Grape size={14} />}
            />
            <InfoItem
              label="Teor alcoólico"
              value={wine.teor_alcoolico}
              icon={<Thermometer size={14} />}
            />
            <InfoItem label="Safra" value={wine.safra} icon={<Sparkles size={14} />} />
          </dl>

          <TextSection title="Harmonização" value={wine.harmonizacao} icon={<Wine size={18} />} />
          <TextSection title="Ingredientes" value={wine.ingredientes} icon={<Grape size={18} />} />

          {conservacao ? (
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-cellar">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ivory">
                <span className="text-brass">
                  <Thermometer size={18} aria-hidden="true" />
                </span>
                Conservação
              </h2>
              <dl className="grid gap-3">
                <InfoItem label="Armazenagem" value={wine.tipo_de_armazenagem} />
                <InfoItem
                  label="Após aberto"
                  value={wine.tipo_de_armazenagem_apos_aberto}
                />
                <InfoItem
                  label="Informações de conservação"
                  value={wine.informacoes_de_conservacao}
                />
              </dl>
            </section>
          ) : null}

          <TextSection
            title="Opinião do sommelier"
            value={wine.opiniao_do_sommelier}
            icon={<Sparkles size={18} />}
          />
        </section>
      </div>
    </main>
  )
}
