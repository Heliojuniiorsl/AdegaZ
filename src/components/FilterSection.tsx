import type { ReactNode } from 'react'

type FilterSectionProps = {
  title: string
  children: ReactNode
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <section className="border-b border-white/10 py-5 last:border-b-0">
      <h3 className="mb-3 text-sm font-semibold uppercase text-stone-300">{title}</h3>
      {children}
    </section>
  )
}
