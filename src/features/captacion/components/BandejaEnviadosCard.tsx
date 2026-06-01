import { Bell, ArrowRight, AlertTriangle } from 'lucide-react'
import { formatDate } from '../../../core/utils/dates'
import { formatEur } from '../../../core/utils/format'
import { ETAPA_LABELS, type VEnviadosRow } from '../api'

/**
 * Sprint 2026-05-19 Hallazgo #2: variante card para pestaña "Enviados".
 *
 * Muestra:
 *   - Badge destinatario (→ Análisis / → Senior).
 *   - "Enviado hace Xd".
 *   - SLA color (verde/amarillo/rojo) del backend.
 *   - Botón "🔔 Recordar".
 */

const SLA_CLASSES: Record<VEnviadosRow['sla_color'], string> = {
  verde:    'bg-green-50 border-green-200 text-green-700',
  amarillo: 'bg-amber-50 border-amber-200 text-amber-700',
  rojo:     'bg-red-50 border-red-200 text-red-700',
}

const DESTINATARIO_LABELS: Record<VEnviadosRow['tipo_destinatario'], { label: string; color: string }> = {
  analista: { label: '→ Análisis',     color: 'bg-purple-50 border-purple-200 text-purple-700' },
  senior:   { label: '→ Asesor senior', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  otro:     { label: '→ Otro',          color: 'bg-slate-50 border-slate-200 text-slate-700' },
}

interface Props {
  op: VEnviadosRow
  onClick?: (id: string) => void
  onRecordar?: (id: string) => void
}

export default function BandejaEnviadosCard({ op, onClick, onRecordar }: Props) {
  const etapa = op.etapa_operativa ?? 'sin_etapa'
  const etapaLabel = ETAPA_LABELS[etapa] ?? etapa
  const destinatario = DESTINATARIO_LABELS[op.tipo_destinatario] ?? DESTINATARIO_LABELS.otro
  const slaClass = SLA_CLASSES[op.sla_color] ?? SLA_CLASSES.verde
  const slaUrgente = op.sla_color === 'rojo' || op.sla_color === 'amarillo'

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
      {/* Nombre empresa */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-slate-900 truncate">
          {op.empresa_nombre ?? 'Sin empresa'}
        </p>
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${destinatario.color}`}
          title={op.responsable_actual_nombre ?? undefined}
        >
          <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
          {op.tipo_destinatario === 'senior' ? 'Senior' : op.tipo_destinatario === 'analista' ? 'Análisis' : 'Otro'}
        </span>
      </div>

      {op.empresa_nif && (
        <p className="text-xs text-slate-500 mb-2">{op.empresa_nif}</p>
      )}

      {/* Responsable actual */}
      {op.responsable_actual_nombre && (
        <p className="text-xs text-slate-600 mb-2">
          En manos de: <span className="font-medium">{op.responsable_actual_nombre}</span>
        </p>
      )}

      {/* SLA + tiempo desde envío */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${slaClass}`}>
          {slaUrgente && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
          {op.dias_sin_movimiento != null
            ? `Sin movimiento ${op.dias_sin_movimiento}d`
            : 'Sin movimiento'}
        </span>
        {op.dias_desde_envio != null && (
          <span className="text-[11px] text-slate-500">
            Enviado hace {op.dias_desde_envio}d
          </span>
        )}
      </div>

      {/* Importes */}
      {op.valor_estimado_eur != null && op.valor_estimado_eur > 0 && (
        <p className="text-sm font-medium text-slate-900 mb-2">
          {formatEur(op.valor_estimado_eur)}
        </p>
      )}

      {/* Etapa + última actividad */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
        <span className="text-xs text-slate-600">{etapaLabel}</span>
        <span className="text-xs text-slate-400">
          {formatDate(op.updated_at, 'relative')}
        </span>
      </div>

      {/* Acciones */}
      {onRecordar && (
        <div className="mt-3 flex">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onRecordar(op.id)
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition"
          >
            <Bell className="h-3.5 w-3.5" />
            Recordar a {op.responsable_actual_nombre?.split(' ')[0] ?? 'responsable'}
          </button>
        </div>
      )}
    </div>
  )
}
