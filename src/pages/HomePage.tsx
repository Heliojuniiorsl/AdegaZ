import { ArrowRight, BottleWine, PackageSearch } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

type HomeCardProps = {
  to: string
  title: string
  description: string
  icon: ReactNode
}

function HomeCard({ to, title, description, icon }: HomeCardProps) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-cellar transition duration-200 hover:border-brass/45 hover:bg-white/[0.075]"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-brass/25 bg-brass/10 text-brass">
        {icon}
      </span>
      <h2 className="mt-5 text-2xl font-semibold text-ivory">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-stone-400">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brass">
        Acessar
        <ArrowRight size={16} className="transition duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  )
}

export function HomePage() {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl justify-end">
        <ThemeToggle />
      </div>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-brass/25 bg-brass/10 px-3 py-1 text-xs font-semibold uppercase text-brass">
            AdegaZ
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-ivory sm:text-5xl">
            Escolha sua área de trabalho
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
            Consulte vinhos no catálogo ou administre o estoque físico da despensa.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <HomeCard
            to="/adega"
            title="Adega Inteligente"
            description="Pesquisa de vinhos por nome, código, voz, EAN, categorias e filtros."
            icon={<BottleWine size={25} aria-hidden="true" />}
          />
          <HomeCard
            to="/despensa"
            title="Despensa"
            description="Controle de quantidade e local dos vinhos no depósito ou na área de venda."
            icon={<PackageSearch size={25} aria-hidden="true" />}
          />
        </div>
      </section>
    </main>
  )
}
