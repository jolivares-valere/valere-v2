import type { EstadoContrato } from '../../../core/types/entities'

const colors: Record<EstadoContrato, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  tramite: 'bg-blue-100 text-blue-700',
  activo: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  baja: 'bg-slate-200 text-slate-600',
  incidencia: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-slate-200 text-slate-500 line-through',
}

export default function EstadoBadge({ estado }: { estado: EstadoContrato }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[estado]}`}>
      {estado}
    </span>
  )
}
