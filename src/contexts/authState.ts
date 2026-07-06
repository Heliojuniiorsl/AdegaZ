import { createContext } from 'react'
import type { AuthUser } from '../utils/authDb'

export type AuthContextValue = {
  user?: AuthUser
  isLoading: boolean
  login: (matricula: string, senha: string) => Promise<void>
  register: (matricula: string, nome: string, senha: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
