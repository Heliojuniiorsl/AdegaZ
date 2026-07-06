import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AuthContext } from './authState'
import {
  clearAuthSession,
  getSessionUser,
  loginUser,
  registerUser,
  type AuthUser,
} from '../utils/authDb'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const sessionUser = await getSessionUser()

        if (!cancelled) {
          setUser(sessionUser)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (matricula: string, senha: string) => {
    const authUser = await loginUser(matricula, senha)
    setUser(authUser)
  }, [])

  const register = useCallback(async (matricula: string, nome: string, senha: string) => {
    const authUser = await registerUser(matricula, nome, senha)
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setUser(undefined)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
    }),
    [isLoading, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
