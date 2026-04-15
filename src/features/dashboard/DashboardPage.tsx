import { Link } from 'react-router-dom'
import { Building2, FileText, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'
import { useDashboardKPIs, useContratosHuerfanos, useMisTareas } from './api'
import { formatDate } from '../../core/utils/dates'

export default function DashboardPage() {
  const { user } = useAuth()
  const kpis = useDashboardKPIs()
  const huerfanos = useContratosHuerfanos()
  const tareas = useMisTareas(user?.id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Hola, {user?.nombre_completo ?? 'equipo'}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={<Building2 className="h-5 w-5" />} label="Empresas" value={kpis.data?.empresas_activas} to="/empresas" />
        <KPI icon={<FileText className="h-5 w-5" />} label="Contratos activos" value={kpis.data?.contratos_activos} to="/contratos?estado=activo" />
        <KPI icon={<Clock className="h-5 w-5" />} label="Vencen 30 días" value={kpis.data?.vencen_30d} to="/contratos" accent="orange" />
        <KPI icon={<Clock className="h-5 w-5" />} label="Vencen 60 días" value={kpis.data?.vencen_60d} to="/contratos" accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> Acción requerida
            <span className="ml-auto text-xs text-slate-500">{huerfanos.data?.length ?? 0}</span>
          </h2>
          {huerfanos.isLoading && <p className="text-sm text-slate-500">Cargando…</p>}
          {!huerfanos.isLoading && (huerfanos.data?.length ?? 0) === 0 && (
            <p className="text-sm text-slate-500">Sin contratos huérfanos. 🎉</p>
          )}
          <ul className="divide-y divide-slate-100">
            {huerfanos.data?.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <Link to={`/contratos/${h.id}`} className="font-medium text-slate-900 hover:underline">
                    {h.empresa_nombre}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {h.numero_contrato ?? 'Sin nº'} · vence {formatDate(h.fecha_fin)} ({h.dias_para_vencimiento}d)
                  </p>
                </div>
                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  {h.prioridad_renovacion}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Mis tareas pendientes</h2>
          {tareas.isLoading && <p className="text-sm text-slate-500">Cargando…</p>}
          {!tareas.isLoading && (tareas.data?.length ?? 0) === 0 && (
            <p className="text-sm text-slate-500">Sin tareas pendientes.</p>
          )}
          <ul className="space-y-2">
            {tareas.data?.map((t) => (
              <li key={t.id} className="rounded-md border border-slate-100 p-3 text-sm">
                <p className="font-medium text-slate-900">{t.titulo}</p>
                {t.fecha_vencimiento && (
                  <p className="text-xs text-slate-500">Vence {formatDate(t.fecha_vencimiento, 'relative')}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function KPI({ icon, label, value, to, accent }: { icon: React.ReactNode; label: string; value: number | undefined; to: string; accent?: string }) {
  const bg = accent === 'orange' ? 'bg-orange-50 text-orange-700' : accent === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
  return (
    <Link to={to} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex rounded-md p-2 ${bg}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="mt-1 text-sm text-slate-500 group-hover:text-slate-700">{label}</p>
    </Link>
  )
}
