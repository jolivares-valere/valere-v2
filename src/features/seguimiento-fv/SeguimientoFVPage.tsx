import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Zap, AlertTriangle, CheckCircle, WifiOff, Search } from 'lucide-react'
import { useTodasLasPlantas } from './api'

const ESTADO_CONFIG = {
  normal:       { label: 'Normal',       color: 'bg-green-100 text-green-800',   dot: 'bg-green-500' },
  defectuoso:   { label: 'Defectuoso',   color: 'bg-red-100 text-red-800',       dot: 'bg-red-500' },
  desconectado: { label: 'Desconectado', color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  desconocido:  { label: 'Desconocido',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
}

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

export default function SeguimientoFVPage() {
  const { data: plantas, isLoading } = useTodasLasPlantas()
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const plantasFiltradas = (plantas ?? []).filter((p: any) => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase())
      || (p.empresa?.nombre ?? '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    return matchSearch && matchEstado
  })

  // Resumen global
  const allPlantas = plantas ?? []
  const totalPotencia = allPlantas.reduce((s: number, p: any) => s + (p.kpi_realtime?.potencia_actual_kw ?? 0), 0)
  const totalHoy = allPlantas.reduce((s: number, p: any) => s + (p.kpi_realtime?.energia_hoy_kwh ?? 0), 0)
  const totals = {
    normal:       allPlantas.filter((p: any) => p.estado === 'normal').length,
    defectuoso:   allPlantas.filter((p: any) => p.estado === 'defectuoso').length,
    desconectado: allPlantas.filter((p: any) => p.estado === 'desconectado').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Sun className="w-8 h-8 text-amber-400" />
          <h1 className="text-2xl font-display font-bold text-valere-blue-dark">Seguimiento Plantas FV</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Monitorización de instalaciones fotovoltaicas de clientes. Datos actualizados diariamente.
        </p>
      </div>

      {/* KPIs globales */}
      {!isLoading && allPlantas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Total plantas</p>
            <p className="text-2xl font-bold text-slate-800">{allPlantas.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Operativas</p>
            <p className="text-2xl font-bold text-green-600">{totals.normal}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Con incidencia</p>
            <p className="text-2xl font-bold text-red-600">{totals.defectuoso + totals.desconectado}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-1">
            <p className="text-xs text-slate-500 mb-1">Potencia actual</p>
            <p className="text-2xl font-bold text-yellow-600">{fmt(totalPotencia, 1, ' kW')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-1">
            <p className="text-xs text-slate-500 mb-1">Energía hoy</p>
            <p className="text-2xl font-bold text-orange-500">{fmt(totalHoy, 0, ' kWh')}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar planta o cliente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue/20"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'normal', 'defectuoso', 'desconectado'] as const).map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filtroEstado === estado
                  ? 'bg-valere-blue text-white border-valere-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {estado === 'todos' ? 'Todas' : (ESTADO_CONFIG[estado]?.label ?? estado)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de plantas */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Cargando plantas…</div>
      ) : plantasFiltradas.length === 0 ? (
        <div className="py-16 text-center">
          <Sun className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No se encontraron plantas con esos filtros</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Planta</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Capacidad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Potencia</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Hoy</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plantasFiltradas.map((planta: any) => {
                const cfg = ESTADO_CONFIG[planta.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.desconocido
                const kpi = planta.kpi_realtime
                return (
                  <tr key={planta.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <div>
                          <p className="font-medium text-slate-800">{planta.nombre}</p>
                          <p className="text-xs text-slate-400">{planta.station_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {planta.empresa ? (
                        <Link
                          to={`/empresas/${planta.empresa.id}`}
                          className="text-valere-blue hover:underline font-medium"
                        >
                          {planta.empresa.nombre}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {planta.capacidad_kwp ? `${planta.capacidad_kwp} kWp` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 hidden md:table-cell font-medium">
                      {fmt(kpi?.potencia_actual_kw, 2, ' kW')}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 hidden md:table-cell">
                      {fmt(kpi?.energia_hoy_kwh, 1, ' kWh')}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden lg:table-cell">
                      {kpi?.energia_total_kwh != null
                        ? fmt(kpi.energia_total_kwh / 1000, 1, ' MWh')
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
