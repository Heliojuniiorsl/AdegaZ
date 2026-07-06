import { LogOut, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-left sm:flex">
        <UserRound size={16} className="shrink-0 text-brass" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ivory">{user.nome}</p>
          <p className="text-[11px] text-stone-400">Matrícula {user.matricula}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-stone-200 transition duration-200 hover:border-brass/45 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
        title="Sair"
      >
        <LogOut size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </div>
  )
}
