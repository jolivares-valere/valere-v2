import { Link } from 'react-router-dom'
import { Building2, FileText, Clock, AlertTriangle, TrendingUp, Percent, Timer, ChevronRight, Flame, User, Users, Zap, TrendingDown } from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'
import {
  useDashboardKPIs,
  useContratosHuerfanos,
  useMisTareas,
  useOportunidadesKPI,
  useKPIsAvanzados,
  useAlertasVencimiento,
  useOportunidadesEstancadas,
  useDashboardScope,
  usePrecioPool,
  type AlertaVencimiento,
  type OportunidadEstancada,
} from './api'
import { useResumenVencimientos } from '../contratos/api'
import IncidenciasDatadisCard from './components/IncidenciasDatadisCard'
import StatusBadge from '../../core/components/StatusBadge'
import { formatDate } from '../../core/utils/dates'

const ETAPA_LABEL: Record<string, string> = {
  prospecto: 'Prospecto',
  contactado: 'Contactado',
  analisis: 'Análisis',
  propuesta_enviada: 'Propuesta enviada',
  negociacion: 'Negociación',
}

const ETAPA_BAR: Record<string, string> = {
  prospecto: 'bg-slate-400',
  contactado: 'bg-blue-500',
  analisis: 'bg-indigo-500',
  propuesta_enviada: 'bg-violet-500',
  negociacion: 'bg-amber-500',
}

function fmtEur(n: number): string {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function colorDias(dias: number): string {
  if (dias < 30) return 'bg-red-100 text-red-700'
  if (dias < 60) return 'bg-orange-100 text-orange-700'
  return 'bg-green-100 text-green-700'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const scope = useDashboardScope()
  const scopeId = scope.pending ? undefined : scope.comercialId
  const kpis = useDashboardKPIs(scopeId)
  const kpisAv = useKPIsAvanzados(scopeId)
  const huerfanos = useContratosHuerfanos(scopeId)
  const tareas = useMisTareas(user?.id)
  const opKPI = useOportunidadesKPI(scopeId)
  const alertasVenc = useAlertasVencimiento(scopeId)
  const opEstancadas = useOportunidadesEstancadas(scopeId)
  const resumenVenc = useResumenVencimientos(scopeId ?? null)

  const totalOps = opKPI.data?.reduce((s, r) => s + r.count, 0) ?? 0
  const totalValor = opKPI.data?.reduce((s, r) => s + r.valor_total, 0) ?? 0
  const maxPipeline = Math.max(1, ...(opKPI.data?.map((r) => r.valor_total) ?? [0]))

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Dashboard</h1>
          <p className="text-sm text-slate-500">Hola, {user?.full_name ?? 'equipo'}</p>
        </div>
        {!scope.pending && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              scope.viewAll
                ? 'bg-valere-blue-medium/10 text-valere-blue-dark ring-1 ring-valere-blue-medium/20'
                : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
            }`}
            title={scope.viewAll ? 'Ves los datos de todo el equipo' : 'Ves solo tus propios datos'}
          >
            {scope.viewAll ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            {scope.viewAll ? 'Vista global' : 'Vista personal'}
          </span>
        )}
      </div>

      {/* Tira de alertas de vencimiento */}
      {resumenVenc.data && resumenVenc.data.total > 0 && (
        <Link
          to="/contratos?vencimiento=1"
          className="mb-6 flex items-center gap-4 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="inline-flex rounded-xl bg-orange-100 p-2 text-orange-700">
            <Flame className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {resumenVenc.data.total} contratos proximos a vencer
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                <span className="font-medium text-red-700">{resumenVenc.data.criticas}</span> criticas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                <span className="font-medium text-orange-700">{resumenVenc.data.proximas}</span> proximas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-medium text-amber-700">{resumenVenc.data.futuras}</span> futuras
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
      )}

      {/* Alarma incidencias Datadis (CUPS por dar de alta / que no coinciden) */}
      <IncidenciasDatadisCard />

      {/* KPIs fila 1 */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={<Building2 className="h-5 w-5" />} label="Empresas" value={kpis.data?.empresas_activas} to="/empresas" />
        <KPI icon={<FileText className="h-5 w-5" />} label="Contratos activos" value={kpis.data?.contratos_activos} to="/contratos?estado=activo" />
        <KPI icon={<Clock className="h-5 w-5" />} label="Vencen 30 dias" value={kpis.data?.vencen_30d} to="/contratos" accent="orange" />
        <KPI icon={<TrendingUp className="h-5 w-5" />} label="Oportunidades abiertas" value={totalOps} to="/oportunidades" accent="blue" />
      </div>

      {/* KPIs fila 2 */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={<Clock className="h-5 w-5" />} label="Vencen 90 dias" value={kpisAv.data?.vencen_90d} to="/contratos" accent="amber" />
        <KPI icon={<AlertTriangle className="h-5 w-5" />} label="Contratos en incidencia" value={kpisAv.data?.contratos_incidencia} to="/contratos?estado=incidencia" accent="red" />
        <KPI icon={<Timer className="h-5 w-5" />} label="Oport. sin actividad 30d" value={kpisAv.data?.oportunidades_estancadas} to="/oportunidades" accent="orange" />
        <KPI
          icon={<Percent className="h-5 w-5" />}
          label={`Tasa cierre 6m (${(kpisAv.data?.ganadas_6m ?? 0) + (kpisAv.data?.perdidas_6m ?? 0)})`}
          value={kpisAv.data ? `${kpisAv.data.tasa_cierre_pct}%` : undefined}
          to="/oportunidades"
          accent={
            kpisAv.data && kpisAv.data.tasa_cierre_pct >= 50 ? 'green'
              : kpisAv.data && kpisAv.data.tasa_cierre_pct >= 25 ? 'amber' : 'red'
          }
        />
      </div>

      {/* Widget precio pool OMIE */}
      <PrecioPoolWidget />

      {/* Alertas accionables */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-slate-900">Alertas accionables</h2>
        </div>
        <div className="grid gap-0 lg:grid-cols-2">
          <AlertasContratos loading={alertasVenc.isLoading} rows={alertasVenc.data ?? []} />
          <AlertasOportunidades loading={opEstancadas.isLoading} rows={opEstancadas.data ?? []} />
        </div>
      </section>

      {/* Pipeline visual */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TrendingUp className="h-4 w-4 text-valere-blue-medium" />
          Pipeline por etapa
          {totalValor > 0 && (
            <span className="ml-auto text-xs font-normal text-slate-500">
              {fmtEur(totalValor)} en juego · {totalOps} oportunidades
            </span>
          )}
        </h2>
        {opKPI.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
        {!opKPI.isLoading && (opKPI.data?.length ?? 0) === 0 && (
          <p className="text-sm text-slate-500">No hay oportunidades abiertas.</p>
        )}
        <div className="space-y-3">
          {opKPI.data?.map((row) => {
            const pct = Math.round((row.valor_total / maxPipeline) * 100)
            return (
              <div key={row.etapa}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-slate-700">{ETAPA_LABEL[row.etapa] ?? row.etapa}</span>
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900">{row.count}</span> · {fmtEur(row.valor_total)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${ETAPA_BAR[row.etapa] ?? 'bg-slate-400'}`}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Fila inferior */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Contratos huerfanos
            <span className="ml-auto text-xs text-slate-500">{huerfanos.data?.length ?? 0}</span>
          </h2>
          {huerfanos.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
          {!huerfanos.isLoading && (huerfanos.data?.length ?? 0) === 0 && (
            <p className="text-sm text-slate-500">Sin contratos huerfanos.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {huerfanos.data?.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <Link to={`/contratos/${h.id}`} className="font-medium text-slate-900 hover:underline">
                    {h.empresa_nombre}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {h.numero_contrato ?? 'Sin numero'} · vence {formatDate(h.fecha_fin)} ({h.dias_para_vencimiento}d)
                  </p>
                </div>
                <StatusBadge variant="alert" size="sm">{h.prioridad_renovacion}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Mis tareas pendientes</h2>
          {tareas.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
          {!tareas.isLoading && (tareas.data?.length ?? 0) === 0 && (
            <p className="text-sm text-slate-500">Sin tareas pendientes.</p>
          )}
          <ul className="space-y-2">
            {tareas.data?.map((t) => (
              <li key={t.id} className="rounded-xl border border-slate-100 p-3 text-sm">
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

function PrecioPoolWidget() {
  const { data, isLoading, isError } = usePrecioPool()

  function fmtMWh(v: number | null | undefined): string {
    if (v == null) return '—'
    return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR/MWh'
  }

  const tendencia =
    data?.hoy_eur_mwh != null && data?.mes_anterior_eur_mwh != null
      ? data.hoy_eur_mwh > data.mes_anterior_eur_mwh ? 'up'
        : data.hoy_eur_mwh < data.mes_anterior_eur_mwh ? 'down'
        : 'flat'
      : null

  return (
    <section className="mb-8 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex rounded-lg bg-blue-100 p-1.5 text-blue-700">
          <Zap className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-900">Precio pool OMIE (spot)</h2>
        {data?.ultima_hora && (
          <span className="ml-auto text-xs text-slate-400">
            Actualizado: {new Date(data.ultima_hora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
      </div>
      {isLoading && <p className="text-sm text-slate-500">Cargando precios...</p>}
      {isError && <p className="text-sm text-red-600">No se pudieron cargar los precios de OMIE.</p>}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Media hoy</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{fmtMWh(data?.hoy_eur_mwh)}</span>
              {tendencia === 'up' && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600">
                  <TrendingUp className="h-3.5 w-3.5" /> vs mes ant.
                </span>
              )}
              {tendencia === 'down' && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
                  <TrendingDown className="h-3.5 w-3.5" /> vs mes ant.
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Media mes actual</span>
            <span className="mt-1 text-2xl font-bold text-slate-900">{fmtMWh(data?.mes_eur_mwh)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Media mes anterior</span>
            <span className="mt-1 text-2xl font-bold text-slate-700">{fmtMWh(data?.mes_anterior_eur_mwh)}</span>
          </div>
        </div>
      )}
    </section>
  )
}

function AlertasContratos({ loading, rows }: { loading: boolean; rows: AlertaVencimiento[] }) {
  return (
    <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Contratos que vencen (90 dias)</h3>
      {loading && <p className="text-sm text-slate-500">Cargando...</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-slate-500">Sin alertas en este periodo.</p>}
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <Link to={`/contratos/${r.id}`} className="block truncate font-medium text-slate-900 hover:underline">
                {r.empresa_nombre}
              </Link>
              <p className="truncate text-xs text-slate-500">{r.compania} · {formatDate(r.fecha_fin)}</p>
            </div>
            <span className={`ml-3 shrink-0 rounded px-2 py-0.5 text-xs font-medium ${colorDias(r.dias_restantes)}`}>
              {r.dias_restantes}d
            </span>
            <Link to={`/contratos/${r.id}`} className="ml-2 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Ver contrato">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AlertasOportunidades({ loading, rows }: { loading: boolean; rows: OportunidadEstancada[] }) {
  return (
    <div className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Oportunidades sin actividad (+30 dias)</h3>
      {loading && <p className="text-sm text-slate-500">Cargando...</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-slate-500">Sin alertas en este periodo.</p>}
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <Link to="/oportunidades" className="block truncate font-medium text-slate-900 hover:underline">
                {r.nombre}
              </Link>
              <p className="truncate text-xs text-slate-500">{r.empresa_nombre} · {ETAPA_LABEL[r.etapa] ?? r.etapa}</p>
            </div>
            <div className="ml-3 shrink-0">
              <StatusBadge variant="neutral" size="sm">{r.dias_sin_actualizar}d</StatusBadge>
            </div>
            <Link to="/oportunidades" className="ml-2 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Ver oportunidad">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function KPI({
  icon, label, value, to, accent,
}: {
  icon: React.ReactNode
  label: string
  value: number | string | undefined
  to: string
  accent?: string
}) {
  const bg =
    accent === 'orange' ? 'bg-orange-50 text-orange-700' :
    accent === 'blue'   ? 'bg-blue-50 text-blue-700' :
    accent === 'amber'  ? 'bg-amber-50 text-amber-700' :
    accent === 'red'    ? 'bg-red-50 text-red-700' :
    accent === 'green'  ? 'bg-green-50 text-green-700' :
    'bg-slate-100 text-slate-700'
  return (
    <Link to={to} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex rounded-xl p-2 ${bg}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="mt-1 text-sm text-slate-500 group-hover:text-slate-700">{label}</p>
    </Link>
  )
}
