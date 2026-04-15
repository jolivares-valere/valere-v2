import { useDroppable } from '@dnd-kit/core'
import type { OportunidadConEmpresa } from '../api'
import type { EtapaOportunidad } from '../../../core/types/entities'
import KanbanCard from './KanbanCard'

interface Props {
  etapa: EtapaOportunidad
  titulo: string
  items: OportunidadConEmpresa[]
}

export default function KanbanColumn({ etapa, titulo, items }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const total = items.reduce((sum, o) => sum + (o.valor_estimado_eur ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50 p-3 ${isOver ? 'ring-2 ring-slate-900' : ''}`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900 capitalize">{titulo}</h3>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(total)}
      </p>
      <div className="flex flex-col gap-2">
        {items.map((op) => (<KanbanCard key={op.id} op={op} />))}
        {items.length === 0 && <p className="text-xs text-slate-400">—</p>}
      </div>
    </div>
  )
}
