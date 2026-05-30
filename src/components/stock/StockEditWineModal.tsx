import { Wine } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import type { StockLocation, StockProduct } from '../../types/stock'

export type EditStockProductData = {
  codigo: string
  nome: string
  tipo: string
  quantidade: number
  localEstoque: StockLocation | ''
}

type StockEditWineModalProps = {
  product: StockProduct
  existingCodes: string[]
  onClose: () => void
  onConfirm: (data: EditStockProductData) => void
}

const inputClass =
  'min-h-11 w-full rounded-md border border-white/10 bg-graphite/80 px-3 text-sm text-ivory outline-none transition duration-200 placeholder:text-stone-500 focus:border-brass/60 focus:ring-2 focus:ring-brass/20'

function ProductPreview({ product }: { product: StockProduct }) {
  const [hasError, setHasError] = useState(false)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <span className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-graphite/80">
        {product.imagem && !hasError ? (
          <img
            src={product.imagem}
            alt={product.nome}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        ) : (
          <Wine size={22} className="text-brass/75" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-ivory">{product.nome}</p>
        <p className="mt-1 text-xs font-bold text-brass">{product.codigo}</p>
      </div>
    </div>
  )
}

export function StockEditWineModal({
  product,
  existingCodes,
  onClose,
  onConfirm,
}: StockEditWineModalProps) {
  const [codigo, setCodigo] = useState(product.codigo)
  const [nome, setNome] = useState(product.nome)
  const [tipo, setTipo] = useState(product.tipo || 'Vinho')
  const [quantidade, setQuantidade] = useState(String(Math.max(1, product.estoqueAtual)))
  const [localEstoque, setLocalEstoque] = useState<StockLocation | ''>(product.localEstoque || '')
  const [formError, setFormError] = useState('')
  const trimmedCodigo = codigo.trim()
  const trimmedNome = nome.trim()
  const duplicateCode = trimmedCodigo !== product.codigo && existingCodes.includes(trimmedCodigo)
  const canSubmit = Boolean(trimmedCodigo && trimmedNome && !duplicateCode)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!trimmedCodigo || !trimmedNome) {
      setFormError('Informe o EAN/PLU e o nome do vinho.')
      return
    }

    if (duplicateCode) {
      setFormError('Esse EAN/PLU ja pertence a outro vinho.')
      return
    }

    onConfirm({
      codigo: trimmedCodigo,
      nome: trimmedNome,
      tipo: tipo.trim() || 'Vinho',
      quantidade: Math.max(1, Number(quantidade) || 1),
      localEstoque,
    })
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-cellar shadow-cellar"
      >
        <div className="space-y-4 p-5">
          <ProductPreview product={product} />

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-stone-400">EAN/PLU</span>
            <input
              value={codigo}
              onChange={(event) => {
                setCodigo(event.target.value)
                setFormError('')
              }}
              className={inputClass}
              placeholder="Digite EAN, PLU ou codigo interno..."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Nome do vinho</span>
            <input
              value={nome}
              onChange={(event) => {
                setNome(event.target.value)
                setFormError('')
              }}
              className={inputClass}
              placeholder="Digite o nome do vinho..."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Quantidade</span>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(event) => setQuantidade(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Tipo</span>
              <select
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                className={`${inputClass} appearance-none`}
              >
                <option value="Vinho">Vinho</option>
                <option value="Tinto">Tinto</option>
                <option value="Branco">Branco</option>
                <option value="Espumante">Espumante</option>
                <option value="Rose">Rose</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-stone-400">Local do estoque</span>
            <select
              value={localEstoque}
              onChange={(event) => setLocalEstoque(event.target.value as StockLocation | '')}
              className={`${inputClass} appearance-none`}
            >
              <option value="">Sem local definido</option>
              <option value="deposito">Deposito</option>
              <option value="area-venda">Area de venda</option>
            </select>
          </label>

          {duplicateCode ? (
            <p className="rounded-md border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-sm text-amber-100">
              Esse EAN/PLU ja pertence a outro vinho.
            </p>
          ) : null}

          {formError ? <p className="text-sm text-amber-200">{formError}</p> : null}
        </div>

        <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-white/10 bg-cellar/95 p-5 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-5 text-sm font-bold text-stone-200 transition duration-200 hover:border-brass/40 hover:text-brass"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-brass px-5 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Salvar
          </button>
        </footer>
      </form>
    </div>
  )
}
