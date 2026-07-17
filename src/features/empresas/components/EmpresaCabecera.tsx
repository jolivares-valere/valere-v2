import { FileText, UserCircle, CalendarClock, AlertTriangle } from 'lucide-react'
import StatusBadge, { type StatusVariant } from '../../../core/components/StatusBadge'
import { formatDate } from '../../../core/utils/dates'
import { useEmpresaCabecera } from '../api'
import type { Empresa, PrioridadRenovacion } from '../../../core/types/entities'

const PRIORIDAD_VARIANT: Record<PrioridadRenovacion, StatusVariant> = {
  critica: 'danger',
  alta: 'alert',
  media: 'info',
  baja: 'neutral',
  ok: 'success',
}

const PRIORIDAD_LABEL: Record<PrioridadRenovacion, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ok: 'OK',
}

interface Props {
  empresa: Empresa
  /** Navega a la pestaña Suministros al pulsar la alarma de incidencias. */
  onVerIncidencias: () => void
}

/**
 * Cabecera 360º de la ficha de empresa (PR-1.1, semana 1 CRM ÚTIL):
 * NIF · comercial · nº contratos activos · próxima renovación (badge
 * prioridad) · alarma de incidencias Datadis.
 */
export default function EmpresaCabecera({ empresa, onVerIncidencias }: Props) {
  const { data, isLoading } = useEmpresaCabecera(empresa.id, empresa.comercial_id)

  if (isLoading) {
    return (
      <div className="mt-2 flex flex-wrap gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-36 animate-pulse rounded-full bg-slate-200" />
        ))}
      </div>
    )
  }

  const renov = data?.proximaRenovacion ?? null
  const incidencias = data?.incidenciasDatadis ?? 0

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <Chip>
        <span className="text-slate-500">NIF</span>
        <span className="font-medium text-slate-900">{empresa.nif ?? 'Sin NIF'}</span>
      </Chip>

      <Chip>
        <UserCircle className="h-4 w-4 text-slate-400" />
        <span className="text-slate-500">Comercial</span>
        <span className={data?.comercialNombre ? 'font-medium text-slate-900' : 'italic text-slate-400'}>
          {data?.comercialNombre ?? 'Sin asignar'}
        </span>
      </Chip>

      <Chip>
        <FileText className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-900">{data?.contratosActivos ?? 0}</span>
        <span className="text-slate-500">contratos activos</span>
      </Chip>

      <Chip>
        <CalendarClock className="h-4 w-4 text-slate-400" />
        <span className="text-slate-500">Próx. renovación</span>
        {renov ? (
          <>
            <span className="font-medium text-slate-900">{formatDate(renov.fecha, 'short')}</span>
            <StatusBadge size="sm" variant={PRIORIDAD_VARIANT[renov.prioridad] ?? 'neutral'}>
              {PRIORIDAD_LABEL[renov.prioridad] ?? renov.prioridad}
            </StatusBadge>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </Chip>

      {incidencias > 0 && (
        <button
          type="button"
          onClick={onVerIncidencias}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700 hover:bg-red-100"
          title="Ver incidencias Datadis en Suministros"
        >
          <AlertTriangle className="h-4 w-4" />
          {incidencias} incidencia{incidencias === 1 ? '' : 's'} Datadis
        </button>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
      {children}
    </span>
  )
}
