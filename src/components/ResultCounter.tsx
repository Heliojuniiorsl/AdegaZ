import type { BuscaVinhosEstado } from '../utils/wineUtils'

type ResultCounterProps = {
  total: number
  visible: number
  hasFilters: boolean
  isSearching: boolean
  state: BuscaVinhosEstado
}

export function ResultCounter({
  total,
  visible,
  hasFilters,
  isSearching,
  state,
}: ResultCounterProps) {
  if (state === 'codigo-incompleto') {
    return (
      <p className="mt-1 text-sm text-stone-400">Digite o código completo do produto.</p>
    )
  }

  if (state === 'codigo-sem-resultados') {
    return (
      <p className="mt-1 text-sm text-stone-400">
        Nenhum vinho encontrado para esse código ou EAN.
      </p>
    )
  }

  if (total === 0) {
    return (
      <p className="mt-1 text-sm text-stone-400">
        {isSearching ? 'Nenhum vinho encontrado com esse nome.' : 'Nenhum vinho encontrado.'}
      </p>
    )
  }

  const plural = total === 1 ? 'vinho encontrado' : 'vinhos encontrados'
  const filtros = hasFilters ? ' com os filtros aplicados' : ''
  const exibindo = total > visible ? ` Mostrando ${visible} de ${total}.` : ''

  return (
    <p className="mt-1 text-sm text-stone-400">
      {total} {plural}
      {filtros}.{exibindo}
    </p>
  )
}
