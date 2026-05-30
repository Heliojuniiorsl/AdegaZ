import { Camera, Search } from 'lucide-react'
import { VoiceSearchButton } from './VoiceSearchButton'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  onCameraClick: () => void
  onVoiceClick: () => void
  isListening: boolean
  isVoiceSupported: boolean
  voiceError: string
}

export function SearchBar({
  value,
  onChange,
  onCameraClick,
  onVoiceClick,
  isListening,
  isVoiceSupported,
  voiceError,
}: SearchBarProps) {
  return (
    <div className="w-full min-w-0">
      <label htmlFor="wine-search" className="sr-only">
        Pesquisar vinho
      </label>
      <div className="group flex min-h-16 w-full min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.08] px-3 shadow-cellar backdrop-blur transition duration-300 focus-within:border-brass/70 focus-within:bg-white/[0.11] focus-within:shadow-glow sm:gap-3 sm:px-4">
        <Search className="h-5 w-5 shrink-0 text-brass" strokeWidth={2} aria-hidden="true" />
        <input
          id="wine-search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base text-ivory outline-none placeholder:text-stone-500"
          placeholder="Digite o nome do vinho ou código do produto..."
          autoComplete="off"
        />
        <VoiceSearchButton
          isListening={isListening}
          isSupported={isVoiceSupported}
          onClick={onVoiceClick}
        />
        <button
          type="button"
          onClick={onCameraClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 bg-graphite/70 text-stone-200 transition duration-200 hover:border-brass/50 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/60"
          aria-label="Abrir leitor de código de barras"
          title="Leitor de código de barras"
        >
          <Camera size={20} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
      {isListening || voiceError ? (
        <p
          className={`mt-2 text-left text-sm ${
            voiceError ? 'text-amber-200' : 'text-stone-300'
          }`}
        >
          {voiceError || 'Ouvindo...'}
        </p>
      ) : null}
    </div>
  )
}
