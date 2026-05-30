import {
  CheckCircle2,
  PackageSearch,
  Store,
  TrendingUp,
  Warehouse,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { StockProduct } from '../../types/stock'
import { getStockStatus } from '../../utils/stockUtils'

type StockSummaryCardsProps = {
  products: StockProduct[]
}

type SummaryCardProps = {
  title: string
  value: string
  detail: string
  icon: ReactNode
}

function SummaryCard({ title, value, detail, icon }: SummaryCardProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-cellar transition duration-200 hover:border-brass/35">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-stone-400">{title}</p>
          <p className="mt-2 break-words text-xl font-semibold text-ivory sm:text-2xl">{value}</p>
          <p className="mt-1 text-sm text-stone-400">{detail}</p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brass/25 bg-brass/10 text-brass">
          {icon}
        </span>
      </div>
    </article>
  )
}

export function StockSummaryCards({ products }: StockSummaryCardsProps) {
  const total = products.length
  const emEstoque = products.filter((product) => product.estoqueAtual > 0).length
  const semEstoque = products.filter((product) => getStockStatus(product) === 'sem-estoque').length
  const noDeposito = products.filter((product) => product.localEstoque === 'deposito').length
  const naAreaVenda = products.filter((product) => product.localEstoque === 'area-venda').length
  const semLocal = products.filter((product) => !product.localEstoque).length
  const saidasDia = products.reduce((totalSaidas, product) => totalSaidas + product.saidasHoje, 0)

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <SummaryCard
        title="Total de produtos"
        value={String(total)}
        detail="Itens monitorados"
        icon={<PackageSearch size={21} aria-hidden="true" />}
      />
      <SummaryCard
        title="Em estoque"
        value={String(emEstoque)}
        detail="Com saldo positivo"
        icon={<CheckCircle2 size={21} aria-hidden="true" />}
      />
      <SummaryCard
        title="Sem estoque"
        value={String(semEstoque)}
        detail="Precisam reposição"
        icon={<XCircle size={21} aria-hidden="true" />}
      />
      <SummaryCard
        title="Depósito"
        value={String(noDeposito)}
        detail="Produtos guardados"
        icon={<Warehouse size={21} aria-hidden="true" />}
      />
      <SummaryCard
        title="Área de venda"
        value={String(naAreaVenda)}
        detail={`${semLocal} sem local definido`}
        icon={<Store size={21} aria-hidden="true" />}
      />
      <SummaryCard
        title="Saídas do dia"
        value={String(saidasDia)}
        detail="Baixas registradas"
        icon={<TrendingUp size={21} aria-hidden="true" />}
      />
    </section>
  )
}
