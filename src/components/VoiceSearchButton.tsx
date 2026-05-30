import { Mic, MicOff } from 'lucide-react'

type VoiceSearchButtonProps = {
  isListening: boolean
  isSupported: boolean
  onClick: () => void
}

export function VoiceSearchButton({
  isListening,
  isSupported,
  onClick,
}: VoiceSearchButtonProps) {
  const Icon = isSupported ? Mic : MicOff

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isListening}
      aria-label="Pesquisar por voz"
      title="Pesquisar por voz"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 ${
        isListening
          ? 'animate-pulse border-brass bg-brass text-graphite shadow-glow'
          : isSupported
            ? 'border-white/10 bg-graphite/70 text-stone-200 hover:border-brass/50 hover:text-brass'
            : 'border-white/10 bg-graphite/50 text-stone-500 hover:border-brass/30 hover:text-stone-300'
      }`}
    >
      <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
    </button>
  )
}
