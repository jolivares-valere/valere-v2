import type { EstadoContrato } from '../../../core/types/entities'
import StatusBadge, { type StatusVariant } from '../../../core/components/StatusBadge'

const ESTADO_TO_VARIANT: Record<EstadoContrato, StatusVariant> = {
  borrador: 'neutral',
  tramite: 'info',
  activo: 'success',
  vencido: 'danger',
  baja: 'neutral',
  incidencia: 'warning',
  cancelado: 'neutral',
}

export default function EstadoBadge({ estado }: { estado: EstadoContrato }) {
  const extra = estado === 'cancelado' ? 'line-through' : ''
  return (
    <StatusBadge variant={ESTADO_TO_VARIANT[estado]} size="sm" className={extra}>
      {estado}
    </StatusBadge>
  )
}
