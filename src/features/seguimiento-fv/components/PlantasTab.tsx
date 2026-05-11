import { useState } from 'react'
import { Search, CheckCircle2, AlertTriangle, WifiOff, Battery, Sun } from 'lucide-react'
import type { FxPlanta } from '../fixtures'

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

const ESTADO: Record<string, { label: string; color: string; dot: string; Icon: React.ElementType }> = {
  normal:       { label: 'Operativa',    color: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  Icon: CheckCircle2 },
  defectuoso:   { label: 'Avería',       color: 'bg-red-100 text-red-800',      dot: 'bg-red-500',    Icon: AlertTriangle },
  desconectado: { label: 'Sin conexión', color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400',  Icon: WifiOff },
  desconocido:  { label: 'Desconocido',  color: 'bg-yellow-100 text-yellow-800',dot: 'bg-yellow-400', Icon: Sun },
}

interface Props {
  plantas: FxPlanta[]
}

export default function PlantasTab({ plantas }: Props) {
  const [search,  setSearch]  = useState('')
  const [filtro,  setFiltro]  = useState('todos')

  const plantasFiltradas = plantas.filter(p => {
    const matchS = !search
      || p.nombre.toLowerCase().includes(search.toLowerCase())
      || (p.empresa?.nombre ?? '').toLowerCase().includes(search.toLowerCase())
      || p.station_code.toLowerCase().includes(search.toLowerCase())
    const matchF = filtro === 'todos' || p.estado === filtro
    return matchS && matchF
  })

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar planta, cliente o código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue/20"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'normal', 'defectuoso', 'desconectado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filtro === f
                  ? 'bg-valere-blue text-white border-valere-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f === 'todos' ? 'Todas' : (ESTADO[f]?.label ?? f)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[
                'Planta / código', 'Cliente', 'Capacidad', 'Estado',
                'Potencia', 'Energía hoy', 'CUPS', 'Última sync',
              ].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plantasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                  No hay plantas con esos filtros
                </td>
              </tr>
            ) : plantasFiltradas.map(p => {
              const cfg = ESTADO[p.estado] ?? ESTADO.desconocido
              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div>
                        <p className="font-medium text-slate-800">{p.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.station_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{p.empresa?.nombre ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1">
                      {fmt(p.capacidad_kwp, 1, ' kWp')}
                      {p.tiene_bateria && <Battery className="w-3.5 h-3.5 text-green-500" aria-label="Con batería" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      <cfg.Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">
                    {fmt(p.kpi_realtime?.potencia_actual_kw, 2, ' kW')}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {fmt(p.kpi_realtime?.energia_hoy_kwh, 1, ' kWh')}
                  </td>
                  <td className="px-4 py-3">
                    {(p.cups_asociados ?? []).length > 0 ? (
                      <span className="font-mono text-xs text-slate-600">{p.cups_asociados[0]}</span>
                    ) : (
                      <span className="text-xs text-slate-300">Sin CUPS</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {fmtDate(p.ultima_sync)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
  )
}
