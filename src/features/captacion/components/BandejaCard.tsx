import { Eye } from 'lucide-react'
import { formatDate } from '../../../core/utils/dates'
import { formatEur } from '../../../core/utils/format'
import { ETAPA_LABELS, ETAPA_COLORS, type VMisOportunidadesRow } from '../api'

interface Props {
  op: VMisOportunidadesRow
  onClick?: (id: string) => void
  /**
   * Sprint C 2026-05-05: id del usuario actual.
   * Si se pasa y `op.responsable_actual_id !== currentUserId`, la card
   * muestra badge "Solo seguimiento" para que la creadora entienda que ya
   * no es responsable y solo puede leer/comentar.
   */
  currentUserId?: string | null
}

// Mapeo etapa_operativa → siguiente acción concreta para el responsable
const SIGUIENTE_ACCION: Record<string, string> = {
  nuevo: 'Llamar para presentar Valere',
  contactado: 'Identificar decisor y enviar presentación',
  esperando_factura: 'Llamar para recordar envío de factura',
  factura_recibida: 'Analizar factura y decidir tipo de atención',
  en_analisis: 'Terminar análisis y preparar propuesta',
  asignada_a_senior: 'Contactar al cliente directamente',
  propuesta_en_preparacion: 'Terminar propuesta y pasarla',
  propuesta_lista: 'Enviar propuesta por email al cliente',
  propuesta_enviada: 'Llamar de seguimiento al cliente',
  seguimiento: 'Cerrar (ganada o perdida) o programar visita',
  cerrado: 'Sin acción pendiente',
}

export default function BandejaCard({ op, onClick, currentUserId }: Props) {
  const etapa = op.etapa_operativa ?? 'sin_etapa'
  const etapaLabel = ETAPA_LABELS[etapa] ?? etapa
  const etapaColor = ETAPA_COLORS[etapa] ?? 'bg-slate-50 border-slate-200 text-slate-700'
  const siguienteAccion = SIGUIENTE_ACCION[etapa]

  // Sprint C: la card aparece en "Todos mis casos" (currentUserId pasado).
  // Si no soy responsable, muestro badge "Solo seguimiento" para que la
  // creadora distinga sus casos activos de los que ya gestiona otra persona.
  const esSoloSeguimiento = !!currentUserId && !!op.responsable_actual_id
    && op.responsable_actual_id !== currentUserId

  return (
    <div
      onClick={() => onClick?.(op.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(op.id)
        }
      }}
      role="button"
      tabIndex={0}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-valere-blue-dark"
    >
      {/* Nombre empresa + badge solo seguimiento */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-slate-900 truncate">
          {op.empresa_nombre ?? 'Sin empresa'}
        </p>
        {esSoloSeguimiento && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 shrink-0"
            title="No eres responsable; solo lectura/comentarios"
          >
            <Eye className="h-2.5 w-2.5" />
            Solo seguimiento
          </span>
        )}
      </div>

      {/* NIF empresa */}
      {op.empresa_nif && (
        <p className="text-xs text-slate-500 mb-2">
          {op.empresa_nif}
        </p>
      )}

      {/* Importes */}
      <div className="space-y-1 mb-3">
        {op.valor_estimado_eur != null && op.valor_estimado_eur > 0 && (
          <p className="text-sm font-medium text-slate-900">
            {formatEur(op.valor_estimado_eur)}
          </p>
        )}
        {op.ahorro_anual_estimado != null && op.ahorro_anual_estimado > 0 && (
          <p className="text-xs text-emerald-700 font-medium">
            Ahorro: {formatEur(op.ahorro_anual_estimado)}/año
          </p>
        )}
      </div>

      {/* Siguiente acción (CTA visible) */}
      {siguienteAccion && (
        <p className="text-xs text-valere-blue-dark font-medium mb-3 flex items-start gap-1">
          <span aria-hidden="true">→</span>
          <span>{siguienteAccion}</span>
        </p>
      )}

      {/* Badge etapa + updated_at */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${etapaColor}`}>
          {etapaLabel}
        </span>
        <span className="text-xs text-slate-400">
          {formatDate(op.updated_at, 'relative')}
        </span>
      </div>
    </div>
  )
}
