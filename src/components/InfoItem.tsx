import type { ReactNode } from 'react'
import { getCampoSeguro } from '../utils/wineUtils'

type InfoItemProps = {
  label: string
  value: unknown
  icon?: ReactNode
}

export function InfoItem({ label, value, icon }: InfoItemProps) {
  const valorSeguro = getCampoSeguro(value, { maxLength: 160 })

  if (!valorSeguro) {
    return null
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4 transition duration-200 hover:border-brass/30">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-medium leading-6 text-ivory">{valorSeguro}</dd>
    </div>
  )
}
