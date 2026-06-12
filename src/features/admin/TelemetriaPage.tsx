import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { Activity, RefreshCw } from 'lucide-react'
import { formatDate } from '../../core/utils/dates'
import ErrorState from '../../core/components/ErrorState'
import EmptyState from '../../core/components/EmptyState'
import { SkeletonRow } from '../../components/ui/Skeleton'

interface TelemetryRow {
  id: string
  user_id: string | null
  event_type: string
  payload: Record<string, unknown>
  occurred_at: string
  received_at: string
}

function useTelemetria() {
  return useQuery({
    queryKey: ['admin', 'client_telemetry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_telemetry')
        .select('id, user_id, event_type, payload, occurred_at, received_at')
        .order('occurred_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as TelemetryRow[]
    },
    refetchInterval: 30_000,
  })
}

const TYPE_COLORS: Record<string, string> = {
  error: 'bg-red-100 text-red-800',
  unhandled_rejection: 'bg-red-100 text-red-800',
  error_boundary: 'bg-orange-100 text-orange-800',
  reported_incident: 'bg-amber-100 text-amber-800',
  supabase_query: 'bg-blue-100 text-blue-800',
  web_vital: 'bg-emerald-100 text-emerald-800',
  route_change: 'bg-slate-100 text-slate-700',
  custom: 'bg-violet-100 text-violet-800',
}

export default function TelemetriaPage() {
  const { data, isLoading, error, refetch, isFetching } = useTelemetria()

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Telemetría</h1>
          <p className="text-sm text-slate-500">Últimos 100 eventos. Auto-refresco cada 30s.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
          {isFetching ? 'Actualizando…' : 'Refrescar'}
        </button>
      </div>

      {error ? (
        <ErrorState
          title="No se ha podido cargar la telemetría"
          error={error}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : isLoading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} cols={4} />)}
            </tbody>
          </table>
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Activity className="h-8 w-8" />}
          title="Sin eventos registrados"
          description="Aún no se ha registrado ningún evento de telemetría. Se mostrarán automáticamente conforme los usuarios usen la aplicación."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cuándo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Resumen</th>
                <th className="px-4 py-3">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                    {formatDate(r.occurred_at)}
                    <div className="text-[10px] text-slate-400">{new Date(r.occurred_at).toLocaleTimeString('es-ES')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[r.event_type] ?? 'bg-slate-100 text-slate-700'}`}>
                      {r.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <PayloadSummary type={r.event_type} payload={r.payload} />
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 truncate max-w-[160px]">
                    {r.user_id ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PayloadSummary({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  if (!payload) return <span className="text-slate-400">—</span>
  const p = payload as Record<string, unknown>
  if (type === 'error' || type === 'unhandled_rejection' || type === 'error_boundary') {
    return (
      <div>
        <p className="font-medium text-red-700">{String(p.message ?? 'Error sin mensaje')}</p>
        {p.path != null && <p className="text-[11px] text-slate-500">{String(p.path)}</p>}
      </div>
    )
  }
  if (type === 'web_vital') {
    return <span>{String(p.name)} = <strong>{String(p.value)} ms</strong></span>
  }
  if (type === 'route_change') {
    return <span className="font-mono text-xs">{String(p.path)}</span>
  }
  if (type === 'supabase_query') {
    return (
      <span>
        {String(p.label)} · <strong>{String(p.duration_ms)}ms</strong>
        {p.error != null && <span className="ml-1 text-red-600">· {String(p.error)}</span>}
      </span>
    )
  }
  if (type === 'reported_incident') {
    return (
      <div>
        <p className="font-medium text-amber-700">Incidencia reportada #{String(p.correlation_id ?? '—')}</p>
        <p className="text-[11px] text-slate-500">{String(p.message ?? '')}</p>
      </div>
    )
  }
  // fallback genérico
  return <code className="text-[11px] text-slate-500">{JSON.stringify(p).slice(0, 120)}</code>
}
