import { useDraggable } from '@dnd-kit/core'
import { CheckSquare } from 'lucide-react'
import type { OportunidadConEmpresa } from '../api'
import { calcDiasVencimiento, calcPrioridad, formatComision } from '../../../core/utils/energy'
import PrioridadBadge from '../../contratos/components/PrioridadBadge'

interface Props {
  op: OportunidadConEmpresa
  tareasPendientes?: number
  onClick: () => void
}

export default function KanbanCard({ op, tareasPendientes, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: op.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const dias = calcDiasVencimiento(op.contrato_origen?.fecha_fin ?? null)
  const prioridad = calcPrioridad(dias)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm hover:shadow-md active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-medium text-slate-900">{op.empresa?.nombre ?? op.nombre}</p>
        {tareasPendientes !== undefined && tareasPendientes > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700" title={`${tareasPendientes} tarea(s) pendiente(s)`}>
            <CheckSquare className="h-3 w-3" />
            {tareasPendientes}
          </span>
        )}
      </div>
      {op.contacto?.nombre && (
        <p className="mb-1 text-xs text-slate-500">
          👤 {op.contacto.nombre}{op.contacto.apellidos ? ` ${op.contacto.apellidos}` : ''}
        </p>
      )}
      <p className="mb-1 text-xs text-slate-500">
        {op.tipo.replace('_', ' ')} · {formatComision(op.valor_estimado_eur)}
      </p>
      {op.ahorro_anual_estimado != null && op.ahorro_anual_estimado > 0 && (
        <p className="mb-2 text-xs font-medium text-emerald-700">
          Ahorro: {formatComision(op.ahorro_anual_estimado)}/año
        </p>
      )}
      {op.tipo === 'renovacion' && op.contrato_origen?.fecha_fin && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{dias}d</span>
          <PrioridadBadge prioridad={prioridad} />
        </div>
      )}
    </div>
  )
}