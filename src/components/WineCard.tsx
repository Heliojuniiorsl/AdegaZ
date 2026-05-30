import { ArrowRight, BadgeCheck, Barcode, Grape, MapPin, Tag, Wine } from 'lucide-react'
import { useState } from 'react'
import type { Wine as WineType } from '../types/wine'
import { getCampoSeguro, getUvaPreferida } from '../utils/wineUtils'

type WineCardProps = {
  wine: WineType
  onSelect: () => void
}

function CardImage({ src, alt }: { src?: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>()
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-b from-garnet/25 to-graphite text-brass">
        <Wine size={48} strokeWidth={1.4} aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}

function Fact({ icon: Icon, value }: { icon: typeof Tag; value?: string }) {
  if (!value) {
    return null
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-stone-300">
      <Icon size={13} className="shrink-0 text-brass" aria-hidden="true" />
      <span className="truncate">{value}</span>
    </span>
  )
}

export function WineCard({ wine, onSelect }: WineCardProps) {
  const nome = getCampoSeguro(wine.nome_produto, { maxLength: 180 }) ?? 'Vinho sem nome'
  const codigo = getCampoSeguro(wine.codigo_produto, { maxLength: 80 })
  const imagem = getCampoSeguro(wine.imagem_principal, { maxLength: 600 })
  const marca = getCampoSeguro(wine.marca, { maxLength: 80 })
  const tipo = getCampoSeguro(wine.tipo, { maxLength: 80 })
  const pais = getCampoSeguro(wine.pais_de_origem, { maxLength: 80 })
  const uva = getUvaPreferida(wine)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] p-4 text-left shadow-cellar transition duration-300 hover:-translate-y-1 hover:border-brass/45 hover:bg-white/[0.085] focus:outline-none focus:ring-2 focus:ring-brass/70"
    >
      <div className="mb-4 aspect-[4/5] w-full min-w-0 overflow-hidden rounded-md bg-graphite/70 p-4">
        <CardImage src={imagem} alt={nome} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-base font-semibold leading-6 text-ivory">{nome}</h3>

        {codigo ? (
          <p className="mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-stone-400">
            <Barcode size={14} className="shrink-0 text-brass" aria-hidden="true" />
            <span className="truncate">Código {codigo}</span>
          </p>
        ) : null}

        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <Fact icon={BadgeCheck} value={marca} />
          <Fact icon={Tag} value={tipo} />
          <Fact icon={MapPin} value={pais} />
          <Fact icon={Grape} value={uva} />
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brass transition duration-200 group-hover:gap-3">
          Ver detalhes
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </button>
  )
}
