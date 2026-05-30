import { Eye, Minus, Pencil, Plus, Trash2, Wine } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { StockProduct } from '../../types/stock'
import { getStockLocationLabel } from '../../utils/stockUtils'

type StockTableProps = {
  products: StockProduct[]
  onDetails: (product: StockProduct) => void
  onAddUnit: (product: StockProduct) => void
  onRemoveUnit: (product: StockProduct) => void
  onEdit: (product: StockProduct) => void
  onDelete: (product: StockProduct) => void
}

type ActionButtonProps = {
  label: string
  icon: ReactNode
  onClick: () => void
  variant?: 'primary' | 'danger' | 'ghost'
}

function StockImage({
  src,
  alt,
  size = 'small',
}: {
  src?: string
  alt: string
  size?: 'small' | 'large'
}) {
  const [hasError, setHasError] = useState(false)
  const dimensions = size === 'large' ? 'h-full min-h-36 w-full' : 'h-16 w-12'

  return (
    <div
      className={`${dimensions} flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white p-2`}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        <Wine size={size === 'large' ? 34 : 24} className="text-brass/75" aria-hidden="true" />
      )}
    </div>
  )
}

function ActionButton({ label, icon, onClick, variant = 'ghost' }: ActionButtonProps) {
  const classes = {
    primary: 'border-brass/75 bg-brass/35 text-graphite hover:bg-brass',
    danger: 'border-rose-500/55 bg-rose-500/15 text-rose-500 hover:border-rose-500 hover:bg-rose-500/25',
    ghost: 'border-brass/45 bg-brass/10 text-brass hover:border-brass/70 hover:bg-brass/20',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-full min-w-0 items-center justify-center rounded-md border text-xs font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/50 lg:h-10 lg:w-10 lg:flex-none ${classes[variant]}`}
    >
      {icon}
    </button>
  )
}

function MobileInfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5">
      <dt className="text-[8px] font-medium uppercase leading-none text-stone-500">{label}</dt>
      <dd className="mt-1 truncate text-[11px] font-bold leading-tight text-ivory">{value}</dd>
    </div>
  )
}

export function StockTable({
  products,
  onDetails,
  onAddUnit,
  onRemoveUnit,
  onEdit,
  onDelete,
}: StockTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-8 text-center shadow-cellar">
        <p className="text-lg font-semibold text-ivory">Nenhum produto encontrado.</p>
        <p className="mt-2 text-sm text-stone-400">Tente ajustar a busca ou remover algum filtro.</p>
      </div>
    )
  }

  return (
    <section>
      <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-cellar lg:block">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-white/10 bg-white/[0.055] text-xs uppercase text-stone-400">
            <tr>
              <th className="w-20 px-4 py-4">Imagem</th>
              <th className="w-28 px-4 py-4">Código</th>
              <th className="px-4 py-4">Nome do vinho</th>
              <th className="w-32 px-4 py-4">Tipo</th>
              <th className="w-28 px-4 py-4">Estoque</th>
              <th className="w-40 px-4 py-4">Local</th>
              <th className="w-64 px-4 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {products.map((product) => (
                <tr key={product.id} className="transition duration-200 hover:bg-white/[0.035]">
                  <td className="px-4 py-4">
                    <StockImage src={product.imagem} alt={product.nome} />
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-brass">{product.codigo}</td>
                  <td className="px-4 py-4">
                    <p className="line-clamp-2 text-sm font-semibold text-ivory">{product.nome}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-300">{product.tipo}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-ivory">{product.estoqueAtual}</td>
                  <td className="px-4 py-4 text-sm text-stone-300">
                    {getStockLocationLabel(product.localEstoque)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <ActionButton
                        label="Detalhes"
                        icon={<Eye size={15} aria-hidden="true" />}
                        onClick={() => onDetails(product)}
                      />
                      <ActionButton
                        label="Adicionar"
                        icon={<Plus size={15} aria-hidden="true" />}
                        onClick={() => onAddUnit(product)}
                        variant="primary"
                      />
                      <ActionButton
                        label="Remover"
                        icon={<Minus size={15} aria-hidden="true" />}
                        onClick={() => onRemoveUnit(product)}
                        variant="danger"
                      />
                      <ActionButton
                        label="Editar"
                        icon={<Pencil size={15} aria-hidden="true" />}
                        onClick={() => onEdit(product)}
                      />
                      <ActionButton
                        label="Excluir"
                        icon={<Trash2 size={15} aria-hidden="true" />}
                        onClick={() => onDelete(product)}
                        variant="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {products.map((product) => (
            <article
              key={product.id}
              className="grid grid-cols-[5.85rem_minmax(0,1fr)] gap-2 rounded-xl border border-white/10 bg-white/[0.055] p-2 shadow-cellar sm:grid-cols-[6.4rem_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <StockImage src={product.imagem} alt={product.nome} size="large" />
              </div>

              <div className="grid min-w-0 grid-rows-[auto_auto_auto] gap-2">
                <div className="flex min-h-12 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">
                  <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-ivory">
                    {product.nome}
                  </h3>
                </div>

                <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_3.45rem_minmax(0,1fr)] gap-1.5">
                  <MobileInfoBox label="Código" value={product.codigo} />
                  <MobileInfoBox label="Estoque" value={product.estoqueAtual} />
                  <MobileInfoBox
                    label="Local"
                    value={getStockLocationLabel(product.localEstoque)}
                  />
                </dl>

                <div className="grid grid-cols-5 gap-1.5">
                  <ActionButton
                    label="Ver detalhes"
                    icon={<Eye size={14} aria-hidden="true" />}
                    onClick={() => onDetails(product)}
                  />
                  <ActionButton
                    label="Adicionar"
                    icon={<Plus size={15} aria-hidden="true" />}
                    onClick={() => onAddUnit(product)}
                    variant="primary"
                  />
                  <ActionButton
                    label="Remover"
                    icon={<Minus size={15} aria-hidden="true" />}
                    onClick={() => onRemoveUnit(product)}
                    variant="danger"
                  />
                  <ActionButton
                    label="Editar"
                    icon={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => onEdit(product)}
                  />
                  <ActionButton
                    label="Excluir"
                    icon={<Trash2 size={14} aria-hidden="true" />}
                    onClick={() => onDelete(product)}
                    variant="danger"
                  />
                </div>
              </div>
            </article>
          ))}
      </div>
    </section>
  )
}
