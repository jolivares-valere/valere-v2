import type { PrioridadRenovacion } from '../../../core/types/entities'

const colors: Record<PrioridadRenovacion, string> = {
  critica: 'bg-red-600 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-amber-400 text-slate-900',
  baja: 'bg-green-100 text-green-800',
  ok: 'bg-slate-100 text-slate-600',
}

const labels: Record<PrioridadRenovacion, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ok: 'OK',
}

export default function PrioridadBadge({ prioridad }: { prioridad: PrioridadRenovacion }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[prioridad]}`}>
      {labels[prioridad]}
    </span>
  )
}
