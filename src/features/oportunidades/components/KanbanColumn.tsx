import { useDroppable } from '@dnd-kit/core'
import type { OportunidadConEmpresa } from '../api'
import type { EtapaOportunidad } from '../../../core/types/entities'
import KanbanCard from './KanbanCard'

interface Props {
  etapa: EtapaOportunidad
  titulo: string
  probabilidad: number
  items: OportunidadConEmpresa[]
  tareasPorOportunidad?: Record<string, number>
  onCardClick: (op: OportunidadConEmpresa) => void
}

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export default function KanbanColumn({
  etapa,
  titulo,
  probabilidad,
  items,
  tareasPorOportunidad,
  onCardClick,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const totalValor = items.reduce((sum, o) => sum + (o.valor_estimado_eur ?? 0), 0)
  const totalAhorro = items.reduce((sum, o) => sum + (o.ahorro_anual_estimado ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 ${isOver ? 'ring-2 ring-slate-900' : ''}`}
    >
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
          {probabilidad}%
        </span>
      </div>
      <div className="mb-3 flex items-baseline justify-between text-xs text-slate-500">
        <span>{items.length} opp.</span>
        <span className="tabular-nums">{eur(totalValor)}</span>
      </div>
      {totalAhorro > 0 && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
          Ahorro: {eur(totalAhorro)}/año
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((op) => (
          <KanbanCard
            key={op.id}
            op={op}
            tareasPendientes={tareasPorOportunidad?.[op.id]}
            onClick={() => onCardClick(op)}
          />
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">—</p>}
      </div>
    </div>
  )
}
