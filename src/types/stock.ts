export type StockStatus = 'em-estoque' | 'sem-estoque'

export type StockLocation = 'deposito' | 'area-venda'

export type StockProduct = {
  id: string
  codigo: string
  nome: string
  tipo?: string
  imagem?: string
  estoqueAtual: number
  localEstoque?: StockLocation
  fornecedor?: string
  saidasHoje: number
  movimentos30Dias: number
  diasSemMovimento: number
}

export type StockMovementType =
  | 'entrada'
  | 'venda'
  | 'perda'
  | 'quebra'
  | 'degustacao'
  | 'transferencia'

export type StockMovement = {
  id: string
  data: string
  produtoId: string
  produtoNome: string
  tipo: StockMovementType
  quantidade: number
  observacao?: string
}

export type StockFiltersState = {
  query: string
  tipo: 'todos' | 'tinto' | 'branco' | 'espumante' | 'rose'
  status: 'todos' | StockStatus
  local: 'todos' | StockLocation | 'sem-local'
}
