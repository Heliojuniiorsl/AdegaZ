import { ClipboardList } from 'lucide-react'
import type { StockMovement, StockMovementType } from '../../types/stock'

type StockMovementListProps = {
  movements: StockMovement[]
  limit?: number
  title?: string
  description?: string
}

const movementLabels: Record<StockMovementType, string> = {
  entrada: 'Entrada',
  venda: 'Venda',
  perda: 'Perda',
  quebra: 'Quebra',
  degustacao: 'Degustação',
  transferencia: 'Transferência',
}

export function StockMovementList({
  movements,
  limit = 8,
  title = 'Movimentações recentes',
  description = 'Entradas e baixas registradas',
}: StockMovementListProps) {
  const visibleMovements = movements.slice(0, limit)

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] shadow-cellar">
      <div className="flex items-center gap-3 border-b border-white/10 p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brass/25 bg-brass/10 text-brass">
          <ClipboardList size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ivory">{title}</h2>
          <p className="text-sm text-stone-400">{description}</p>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {visibleMovements.map((movement) => {
          const positive = movement.tipo === 'entrada'
          const sign = positive ? '+' : '-'

          return (
            <article key={movement.id} className="grid gap-3 p-4 sm:grid-cols-[150px_1fr_auto]">
              <time className="text-sm text-stone-400">
                {new Date(movement.data).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold text-ivory">{movement.produtoNome}</p>
                {movement.observacao ? (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-400">{movement.observacao}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-stone-200">
                  {movementLabels[movement.tipo]}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    positive ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200'
                  }`}
                >
                  {sign}
                  {movement.quantidade}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
