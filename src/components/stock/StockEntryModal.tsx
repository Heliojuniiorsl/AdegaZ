import { X } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import type { StockLocation, StockProduct } from '../../types/stock'

export type StockEntryData = {
  quantidade: number
  localEstoque: StockLocation | ''
  fornecedor: string
  observacao: string
}

type StockEntryModalProps = {
  product: StockProduct
  onClose: () => void
  onConfirm: (data: StockEntryData) => void
}

const inputClass =
  'min-h-11 w-full rounded-md border border-white/10 bg-graphite/80 px-3 text-sm text-ivory outline-none transition duration-200 placeholder:text-stone-500 focus:border-brass/60 focus:ring-2 focus:ring-brass/20'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase text-stone-400">{label}</span>
      {children}
    </label>
  )
}

export function StockEntryModal({ product, onClose, onConfirm }: StockEntryModalProps) {
  const [quantidade, setQuantidade] = useState('1')
  const [localEstoque, setLocalEstoque] = useState<StockLocation | ''>(product.localEstoque ?? '')
  const [fornecedor, setFornecedor] = useState(product.fornecedor ?? '')
  const [observacao, setObservacao] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onConfirm({
      quantidade: Math.max(1, Number(quantidade) || 1),
      localEstoque,
      fornecedor,
      observacao,
    })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-cellar shadow-cellar"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-cellar/95 p-5 backdrop-blur">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-ivory">Entrada de estoque</h2>
            <p className="mt-1 line-clamp-2 text-sm text-stone-400">{product.nome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Produto">
            <input value={product.nome} readOnly className={inputClass} />
          </Field>
          <Field label="Código">
            <input value={product.codigo} readOnly className={inputClass} />
          </Field>
          <Field label="Quantidade recebida">
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={(event) => setQuantidade(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Local do estoque">
            <select
              value={localEstoque}
              onChange={(event) => setLocalEstoque(event.target.value as StockLocation | '')}
              className={`${inputClass} appearance-none`}
            >
              <option value="">Sem local definido</option>
              <option value="deposito">Depósito</option>
              <option value="area-venda">Área de venda</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Fornecedor">
              <input
                value={fornecedor}
                onChange={(event) => setFornecedor(event.target.value)}
                className={inputClass}
                placeholder="Fornecedor"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observação">
              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                rows={3}
                className={`${inputClass} resize-none py-3`}
                placeholder="Ex.: reposição, lote, nota fiscal..."
              />
            </Field>
          </div>
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/10 bg-cellar/95 p-5 backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-5 text-sm font-bold text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-brass px-5 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300"
          >
            Confirmar entrada
          </button>
        </footer>
      </form>
    </div>
  )
}
