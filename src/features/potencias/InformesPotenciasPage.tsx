import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3, TrendingDown, CheckCircle2, XCircle, Clock,
  FileText, RefreshCw, Zap, Users
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ExpedienteRow {
  id: string
  estado: string
  anio: number
  tipo_normativa: string
  created_at: string
  empresas: { nombre: string } | null
  ciclos: {
    estado: string
    numero_ciclo: number
    ahorro_real_total: number | null
    ahorro_previsto_total: number | null
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(v: number): string {
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const ESTADO_CICLO_LABEL: Record<string, string> = {
  bajada_pendiente: 'Bajada pendiente',
  bajada_activa:    'Bajada activa',
  bajada_aprobada:  'Bajada aprobada',
  subida_pendiente: 'Subida pendiente',
  subida_activa:    'Subida activa',
  completado:       'Completado',
  cancelado:        'Cancelado',
}

const ESTADO_CICLO_COLOR: Record<string, string> = {
  bajada_pendiente: '#3b82f6',
  bajada_activa:    '#f59e0b',
  bajada_aprobada:  '#22c55e',
  subida_pendiente: '#a855f7',
  subida_activa:    '#f97316',
  completado:       '#10b981',
  cancelado:        '#ef4444',
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, value, label, sub, color = 'bg-blue-50 text-blue-600',
}: {
  icon: React.ReactNode; value: string | number; label: string; sub?: string; color?: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Tabla top clientes ────────────────────────────────────────────────────────

function TopClientesTable({ rows }: { rows: { nombre: string; expedientes: number; completados: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">Sin datos disponibles.</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
          <th className="pb-2 text-left">Empresa</th>
          <th className="pb-2 text-right">Expedientes</th>
          <th className="pb-2 text-right">Completados</th>
          <th className="pb-2 text-right">% completado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map(r => (
          <tr key={r.nombre}>
            <td className="py-2 font-medium text-slate-900">{r.nombre}</td>
            <td className="py-2 text-right text-slate-600">{r.expedientes}</td>
            <td className="py-2 text-right text-slate-600">{r.completados}</td>
            <td className="py-2 text-right">
              <span className={`font-semibold ${r.completados === r.expedientes ? 'text-emerald-600' : 'text-slate-600'}`}>
                {r.expedientes > 0 ? Math.round((r.completados / r.expedientes) * 100) : 0}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function InformesPotenciasPage() {
  const { data, loading, refetch } = useSupabaseQuery<ExpedienteRow>({
    table: 'expedientes',
    select: `
      id, estado, anio, tipo_normativa, created_at,
      empresas ( nombre ),
      ciclos ( estado, numero_ciclo, ahorro_real_total, ahorro_previsto_total )
    `,
    order: { column: 'created_at', ascending: false },
  })

  const stats = useMemo(() => {
    const total      = data.length
    const activos    = data.filter(e => e.estado === 'activo').length
    const cancelados = data.filter(e => e.estado === 'cancelado').length

    // Último ciclo de cada expediente
    const ultimosCiclos = data.map(e => {
      const sorted = [...(e.ciclos ?? [])].sort((a, b) => b.numero_ciclo - a.numero_ciclo)
      return sorted[0]
    }).filter(Boolean)

    // Distribución por estado de ciclo
    const estadoCount = ultimosCiclos.reduce<Record<string, number>>((acc, c) => {
      if (c) acc[c.estado] = (acc[c.estado] ?? 0) + 1
      return acc
    }, {})

    const chartData = Object.entries(estadoCount)
      .map(([estado, count]) => ({
        estado,
        label: ESTADO_CICLO_LABEL[estado] ?? estado,
        count,
        color: ESTADO_CICLO_COLOR[estado] ?? '#94a3b8',
      }))
      .sort((a, b) => b.count - a.count)

    // Ahorros
    const todosLosCiclos = data.flatMap(e => e.ciclos ?? [])
    const ahorroPrevisto = todosLosCiclos.reduce((s, c) => s + (c.ahorro_previsto_total ?? 0), 0)
    const ahorroReal     = todosLosCiclos.reduce((s, c) => s + (c.ahorro_real_total ?? 0), 0)

    // Top clientes
    const porCliente = data.reduce<Record<string, { nombre: string; expedientes: number; completados: number }>>(
      (acc, e) => {
        const nombre = e.empresas?.nombre ?? '—'
        if (!acc[nombre]) acc[nombre] = { nombre, expedientes: 0, completados: 0 }
        acc[nombre].expedientes++
        const tieneCompletado = (e.ciclos ?? []).some(c => c.estado === 'completado')
        if (tieneCompletado) acc[nombre].completados++
        return acc
      }, {}
    )
    const topClientes = Object.values(porCliente)
      .sort((a, b) => b.expedientes - a.expedientes)
      .slice(0, 8)

    return { total, activos, cancelados, chartData, ahorroPrevisto, ahorroReal, topClientes }
  }, [data])

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Informes de Potencias</h1>
            <p className="text-sm text-slate-500">
              Métricas y seguimiento de la gestión de potencias — RDL 7/2026
            </p>
          </div>
          <button onClick={() => refetch()} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={<FileText className="h-5 w-5" />}
              value={stats.total}
              label="Expedientes totales"
              color="bg-blue-50 text-blue-600"
            />
            <KpiCard
              icon={<Clock className="h-5 w-5" />}
              value={stats.activos}
              label="Activos"
              sub={`${stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}% del total`}
              color="bg-amber-50 text-amber-600"
            />
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              value={stats.chartData.find(d => d.estado === 'completado')?.count ?? 0}
              label="Ciclos completados"
              color="bg-emerald-50 text-emerald-600"
            />
            <KpiCard
              icon={<XCircle className="h-5 w-5" />}
              value={stats.cancelados}
              label="Cancelados"
              color="bg-red-50 text-red-600"
            />
          </div>

          {/* Ahorros */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-green-500" />
                <h2 className="text-sm font-bold text-slate-700">Ahorro previsto total</h2>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {stats.ahorroPrevisto > 0 ? fmtEur(stats.ahorroPrevisto) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Suma del ahorro previsto de todos los ciclos</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-700">Ahorro real conseguido</h2>
              </div>
              <p className="text-3xl font-black text-emerald-700">
                {stats.ahorroReal > 0 ? fmtEur(stats.ahorroReal) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Ahorro confirmado en ciclos completados</p>
            </div>
          </div>

          {/* Gráfico distribución por estado */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-700">Distribución por estado de ciclo</h2>
            </div>
            {stats.chartData.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => { const n = Number(value ?? 0); return [`${n} expediente${n !== 1 ? 's' : ''}`, '']; }}
                    labelStyle={{ fontWeight: 600, fontSize: 12 }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top clientes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <h2 className="text-sm font-bold text-slate-700">Expedientes por cliente</h2>
              </div>
              <Link
                to="/potencias/expedientes"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Ver todos <Zap className="h-3 w-3" />
              </Link>
            </div>
            <TopClientesTable rows={stats.topClientes} />
          </div>

        </div>
      )}
    </div>
  )
}
