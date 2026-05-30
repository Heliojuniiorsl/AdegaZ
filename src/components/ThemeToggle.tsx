import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'adegaz:theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY)

  return savedTheme === 'light' ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <div
      className="fixed bottom-4 right-4 z-50 inline-flex rounded-lg border border-white/10 bg-graphite/80 p-1 shadow-cellar backdrop-blur"
      role="group"
      aria-label="Selecionar tema"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-bold transition duration-200 ${
          theme === 'light'
            ? 'bg-brass text-graphite'
            : 'text-stone-300 hover:bg-white/[0.08] hover:text-brass'
        }`}
      >
        <Sun size={16} aria-hidden="true" />
        Claro
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-bold transition duration-200 ${
          theme === 'dark'
            ? 'bg-brass text-graphite'
            : 'text-stone-300 hover:bg-white/[0.08] hover:text-brass'
        }`}
      >
        <Moon size={16} aria-hidden="true" />
        Escuro
      </button>
    </div>
  )
}
