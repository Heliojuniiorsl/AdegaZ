import { Badge, BottleWine, LockKeyhole, UserRound } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../contexts/useAuth'

type LoginMode = 'login' | 'cadastro'

type LocationState = {
  from?: {
    pathname?: string
  }
}

const inputClass =
  'min-h-12 w-full rounded-md border border-white/10 bg-graphite/80 px-3 text-sm font-semibold text-ivory outline-none transition duration-200 placeholder:text-stone-500 focus:border-brass/60 focus:ring-2 focus:ring-brass/20'

export function LoginPage() {
  const { user, isLoading, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const redirectTo = state?.from?.pathname || '/adega'
  const [mode, setMode] = useState<LoginMode>('login')
  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (mode === 'cadastro') {
        await register(matricula, nome, senha)
      } else {
        await login(matricula, senha)
      }

      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível entrar. Confira os dados.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <section className="w-full max-w-md animate-fade-in rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-cellar sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-brass/30 bg-brass/10 text-brass shadow-glow">
            <BottleWine size={25} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xl font-semibold text-ivory">AdegaZ</p>
            <p className="text-sm text-stone-400">
              {mode === 'cadastro' ? 'Criar acesso local' : 'Acessar sua adega'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-md border border-white/10 bg-graphite/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`min-h-10 rounded-md text-sm font-bold transition duration-200 ${
              mode === 'login' ? 'bg-brass text-graphite' : 'text-stone-300 hover:text-brass'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('cadastro')
              setError('')
            }}
            className={`min-h-10 rounded-md text-sm font-bold transition duration-200 ${
              mode === 'cadastro' ? 'bg-brass text-graphite' : 'text-stone-300 hover:text-brass'
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-stone-400">
              <Badge size={14} className="text-brass" aria-hidden="true" />
              Matrícula
            </span>
            <input
              value={matricula}
              onChange={(event) => setMatricula(event.target.value)}
              className={inputClass}
              placeholder="Digite sua matrícula"
              autoComplete="username"
            />
          </label>

          {mode === 'cadastro' ? (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-stone-400">
                <UserRound size={14} className="text-brass" aria-hidden="true" />
                Nome
              </span>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className={inputClass}
                placeholder="Digite seu nome"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-stone-400">
              <LockKeyhole size={14} className="text-brass" aria-hidden="true" />
              Senha
            </span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className={inputClass}
              placeholder="Mínimo de 6 caracteres"
              autoComplete={mode === 'cadastro' ? 'new-password' : 'current-password'}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brass px-4 text-sm font-bold text-graphite transition duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Aguarde...'
              : mode === 'cadastro'
                ? 'Criar cadastro'
                : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-stone-500">
          Os dados ficam neste navegador. Cada matrícula usa um estoque separado salvo localmente.
        </p>
      </section>
    </main>
  )
}

export default LoginPage
