import type { StockStatus } from '../../types/stock'
import { getStatusLabel } from '../../utils/stockUtils'

const statusClasses: Record<StockStatus, string> = {
  'em-estoque': 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  'sem-estoque': 'border-rose-400/35 bg-rose-400/10 text-rose-200',
}

export function ProductStatusBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={`inline-flex min-h-8 items-center justify-center rounded-full border px-3 text-xs font-bold ${statusClasses[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
