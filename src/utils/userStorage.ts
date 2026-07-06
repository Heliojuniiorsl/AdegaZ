import type { StockProduct } from '../types/stock'

function getSafeMatricula(matricula: string) {
  return matricula.trim().replace(/[^\w.-]+/g, '_')
}

function getUserStockKey(matricula: string) {
  return `adegaz:user-db:${getSafeMatricula(matricula)}:stock-products`
}

export function loadUserStockProducts(matricula: string) {
  try {
    const raw = localStorage.getItem(getUserStockKey(matricula))
    const parsed = raw ? (JSON.parse(raw) as StockProduct[]) : undefined

    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function saveUserStockProducts(matricula: string, products: StockProduct[]) {
  localStorage.setItem(getUserStockKey(matricula), JSON.stringify(products))
}
