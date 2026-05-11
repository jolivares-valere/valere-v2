import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Sun, Zap } from 'lucide-react'
import type { FxPlanta, FxKpiDiario } from '../fixtures'

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

interface Props {
  plantas:   FxPlanta[]
  kpiDiario: Record<string, FxKpiDiario[]>
}

export default function ProduccionTab({ plantas, kpiDiario }: Props) {
  const [plantaId, setPlantaId] = useState<string>(plantas[0]?.id ?? '')

  const planta   = plantas.find(p => p.id === plantaId)
  const kpis     = kpiDiario[plantaId] ?? []

  // Resumen mensual
  const totalMes    = kpis.reduce((s, k) => s + k.energia_kwh, 0)
  const excdMes     = kpis.reduce((s, k) => s + k.excedente_kwh, 0)
  const autoconsMes = kpis.reduce((s, k) => s + k.autoconsumida_kwh, 0)
  const maxDia      = Math.max(...kpis.map(k => k.energia_kwh))
  const diasActivos = kpis.filter(k => k.energia_kwh > 0).length

  // Datos para recharts (últimos 30 días, etiqueta corta)
  const chartData = kpis.map(k => ({
    fecha: k.fecha.slice(5), // MM-DD
    Autoconsumo:  Math.round(k.autoconsumida_kwh * 10) / 10,
    Excedente:    Math.round(k.excedente_kwh * 10) / 10,
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
            <option key={p.id} value={p.id}>{p.nombre} — {p.empresa?.nombre ?? 'Sin asignar'}</option>
          ))}
        </select>
        {planta?.estado !== 'normal' && (
          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-200">
            ⚠ Planta con incidencia
          </span>
        )}
      </div>

      {/* KPI cards del mes */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Generación total (mes)',  value: fmt(totalMes, 0, ' kWh'),    Icon: Sun,       color: 'text-amber-500' },
          { label: 'Excedentes a red (mes)',  value: fmt(excdMes, 0, ' kWh'),     Icon: TrendingUp,color: 'text-blue-500' },
          { label: 'Autoconsumo (mes)',       value: fmt(autoconsMes, 0, ' kWh'), Icon: Zap,       color: 'text-green-500' },
          { label: 'Ratio autoconsumo',       value: totalMes > 0 ? fmt((autoconsMes / totalMes) * 100, 0, ' %') : '—', Icon: Zap, color: 'text-green-600' },
          { label: 'Mejor día (30d)',         value: fmt(maxDia, 0, ' kWh'),      Icon: Sun,       color: 'text-orange-500' },
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

        {kpis.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-slate-300 text-sm">
            Sin datos de producción
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Autoconsumo" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Excedente"   stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabla de detalle (últimos 7 días) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <span className="font-semibold text-slate-800 text-sm">Detalle últimos 7 días</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Fecha', 'Generación', 'Excedente', 'Autoconsumo', 'Ratio exc.', 'Potencia máx.', 'Ingresos est.'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {kpis.slice(-7).reverse().map(k => (
              <tr key={k.fecha} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-700">{k.fecha}</td>
                <td className="px-4 py-2.5 text-slate-700">{fmt(k.energia_kwh, 1, ' kWh')}</td>
                <td className="px-4 py-2.5 text-blue-600">{fmt(k.excedente_kwh, 1, ' kWh')}</td>
                <td className="px-4 py-2.5 text-green-600">{fmt(k.autoconsumida_kwh, 1, ' kWh')}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {k.energia_kwh > 0 ? fmt((k.excedente_kwh / k.energia_kwh) * 100, 0, ' %') : '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{fmt(k.potencia_max_kw, 1, ' kW')}</td>
                <td className="px-4 py-2.5 text-slate-600">{fmt(k.ingresos_eur, 2, ' €')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
