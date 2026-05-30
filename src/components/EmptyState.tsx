import { Search, Wine } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description: string
  variant?: 'search' | 'wine'
}

export function EmptyState({ title, description, variant = 'search' }: EmptyStateProps) {
  const Icon = variant === 'search' ? Search : Wine

  return (
    <section className="mx-auto flex max-w-xl animate-fade-in flex-col items-center rounded-lg border border-white/10 bg-white/[0.04] px-6 py-12 text-center shadow-cellar">
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass">
        <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2 className="text-xl font-semibold text-ivory">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-300">{description}</p>
    </section>
  )
}
