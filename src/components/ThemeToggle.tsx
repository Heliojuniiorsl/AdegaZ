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

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <div
      className={`relative inline-grid h-11 w-[5.75rem] shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-full border border-white/10 bg-graphite/80 p-1 shadow-cellar backdrop-blur transition duration-500 ${className}`}
      role="group"
      aria-label="Selecionar tema"
    >
      <span
        aria-hidden="true"
        className={`absolute left-1 top-1 h-9 w-10 rounded-full bg-brass shadow-[0_0_24px_rgba(214,169,79,0.36)] transition-transform duration-500 ease-out ${
          theme === 'dark' ? 'translate-x-11' : 'translate-x-0'
        }`}
      />
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label="Ativar tema claro"
        title="Ativar tema claro"
        className={`relative z-10 inline-flex h-9 w-10 items-center justify-center rounded-full transition duration-500 ${
          theme === 'light'
            ? 'scale-105 text-graphite'
            : 'text-stone-300 hover:text-brass'
        }`}
      >
        <Sun
          size={17}
          aria-hidden="true"
          className={`transition duration-500 ${
            theme === 'light' ? 'rotate-0 scale-110' : '-rotate-45 scale-90'
          }`}
        />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label="Ativar tema escuro"
        title="Ativar tema escuro"
        className={`relative z-10 inline-flex h-9 w-10 items-center justify-center rounded-full transition duration-500 ${
          theme === 'dark'
            ? 'scale-105 text-graphite'
            : 'text-stone-300 hover:text-brass'
        }`}
      >
        <Moon
          size={17}
          aria-hidden="true"
          className={`transition duration-500 ${
            theme === 'dark' ? 'rotate-0 scale-110' : 'rotate-45 scale-90'
          }`}
        />
      </button>
    </div>
  )
}
