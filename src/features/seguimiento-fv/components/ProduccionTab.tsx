import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Sun, Zap, Euro } from 'lucide-react'
import type { FVPlanta } from '../api'
import { useKpiDiarioPorPlanta } from '../api'

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

interface Props {
  plantas: FVPlanta[]
}

export default function ProduccionTab({ plantas }: Props) {
  const [plantaId, setPlantaId] = useState<string>(plantas[0]?.id ?? '')

  const { data: kpis = [], isLoading } = useKpiDiarioPorPlanta(plantaId || undefined, 30)

  const planta = plantas.find(p => p.id === plantaId)

  // Resumen del período
  const totalMes    = kpis.reduce((s, k) => s + (k.energia_kwh ?? 0), 0)
  const ingresosMes = kpis.reduce((s, k) => s + (k.ingresos_eur ?? 0), 0)
  const maxDia      = kpis.length > 0 ? Math.max(...kpis.map(k => k.energia_kwh ?? 0)) : 0
  const diasActivos = kpis.filter(k => (k.energia_kwh ?? 0) > 0).length

  // Datos para recharts
  const chartData = kpis.map(k => ({
    fecha:      k.fecha.slice(5),
    Generación: Math.round((k.energia_kwh ?? 0) * 10) / 10,
  }))

  return (
    <div className="space-y-5">

      {/* Selector de planta */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600 shrink-0">Planta:</label>
        <select
          value={plantaId}
          onChange={e => setPlantaId(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue/20 bg-white"
        >
          {plantas.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre} — {(p as unknown as { empresa?: { nombre: string } }).empresa?.nombre ?? 'Sin asignar'}
            </option>
          ))}
        </select>
        {planta?.estado != null && planta.estado !== 'normal' && (
          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-200">
            ⚠ Planta con incidencia
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Generación total (30d)', value: fmt(totalMes, 0, ' kWh'),    Icon: Sun,        color: 'text-amber-500' },
          { label: 'Ingresos estimados',     value: fmt(ingresosMes, 2, ' €'),   Icon: Euro,       color: 'text-emerald-600' },
          { label: 'Mejor día (30d)',         value: fmt(maxDia, 0, ' kWh'),      Icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Días activos (30d)',      value: `${diasActivos} días`,       Icon: Zap,        color: 'text-green-500' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <Icon className={`w-4 h-4 ${color} mb-1.5`} />
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico 30 días */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Producción diaria — últimos 30 días</h3>
          <span className="text-xs text-slate-400">{diasActivos} días con generación</span>
        </div>

        {isLoading ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm animate-pulse">
            Cargando datos…
          </div>
        ) : kpis.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-slate-300 text-sm">
            Sin datos de producción — lanza un sync para obtener datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                unit=" kWh"
                width={55}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(v, name) => [`${v as number} kWh`, name as string] as [string, string]}
                labelFormatter={l => `Día ${l}`}
              />
              <Bar dataKey="Generación" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabla de detalle */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <span className="font-semibold text-slate-800 text-sm">Detalle últimos 7 días</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Fecha', 'Generación', 'Ingresos est.'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-sm animate-pulse">Cargando…</td>
              </tr>
            ) : kpis.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-300 text-sm">Sin datos</td>
              </tr>
            ) : (
              [...kpis].reverse().slice(0, 7).map(k => (
                <tr key={k.fecha} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{k.fecha}</td>
                  <td className="px-4 py-2.5 text-amber-600">{fmt(k.energia_kwh, 1, ' kWh')}</td>
                  <td className="px-4 py-2.5 text-emerald-600">{fmt(k.ingresos_eur, 2, ' €')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
