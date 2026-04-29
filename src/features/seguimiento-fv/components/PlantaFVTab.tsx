import { useState } from 'react'
import { Sun, Zap, Battery, AlertTriangle, CheckCircle, WifiOff, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  usePlantasPorEmpresa,
  useAlarmasPorPlanta,
  useKpiDiarioPorPlanta,
  useDispositivosPorPlanta,
  useSyncLogEmpresa,
  type FVPlanta,
  type FVAlarma,
} from '../api'

// ──────────────────────────────
// Helpers
// ──────────────────────────────

function fmt(n: number | null | undefined, decimals = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(decimals) + suffix
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

const ESTADO_BADGE: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  normal:       { color: 'bg-green-100 text-green-800',  label: 'Normal',       icon: <CheckCircle className="w-3 h-3" /> },
  defectuoso:   { color: 'bg-red-100 text-red-800',      label: 'Defectuoso',   icon: <AlertTriangle className="w-3 h-3" /> },
  desconectado: { color: 'bg-slate-100 text-slate-600',  label: 'Desconectado', icon: <WifiOff className="w-3 h-3" /> },
  desconocido:  { color: 'bg-yellow-100 text-yellow-800',label: 'Desconocido',  icon: null },
}

const SEVERIDAD_COLOR: Record<string, string> = {
  critica:    'bg-red-100 text-red-800 border-red-200',
  mayor:      'bg-orange-100 text-orange-800 border-orange-200',
  menor:      'bg-yellow-100 text-yellow-800 border-yellow-200',
  advertencia:'bg-blue-100 text-blue-800 border-blue-200',
  desconocida:'bg-slate-100 text-slate-600 border-slate-200',
}

// ──────────────────────────────
// PlantaFVTab — componente principal del tab
// ──────────────────────────────

export default function PlantaFVTab({ empresaId }: { empresaId: string }) {
  const { data: plantas, isLoading, refetch } = usePlantasPorEmpresa(empresaId)
  const { data: syncLogs } = useSyncLogEmpresa(empresaId, 3)
  const [expandedPlanta, setExpandedPlanta] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Cargando datos de plantas FV…
      </div>
    )
  }

  if (!plantas || plantas.length === 0) {
    return (
      <div className="py-12 text-center">
        <Sun className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Sin plantas FV registradas</p>
        <p className="text-slate-400 text-sm mt-1">
          El cliente no tiene instalaciones fotovoltaicas vinculadas o aún no se han sincronizado.
        </p>
      </div>
    )
  }

  const lastSync = syncLogs?.[0]

  return (
    <div className="space-y-4">

      {/* Estado de última sincronización */}
      {lastSync && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          lastSync.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <RefreshCw className="w-3 h-3 shrink-0" />
          <span>
            Última sincronización: <strong>{fmtDate(lastSync.iniciado_en)}</strong>
            {' '}— {lastSync.ok ? `${lastSync.plantas_sync} plantas, ${lastSync.alarmas_sync} alarmas` : lastSync.mensaje}
          </span>
        </div>
      )}

      {/* Resumen KPIs del cliente */}
      <ResumenKpis plantas={plantas} />

      {/* Lista de plantas */}
      <div className="space-y-3">
        {plantas.map((planta) => (
          <PlantaCard
            key={planta.id}
            planta={planta}
            expanded={expandedPlanta === planta.id}
            onToggle={() => setExpandedPlanta(expandedPlanta === planta.id ? null : planta.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────
// Resumen KPIs aggregados
// ──────────────────────────────

function ResumenKpis({ plantas }: { plantas: FVPlanta[] }) {
  const totalHoy = plantas.reduce((s, p) => s + (p.kpi_realtime?.energia_hoy_kwh ?? 0), 0)
  const totalMes  = plantas.reduce((s, p) => s + (p.kpi_realtime?.energia_mes_kwh ?? 0), 0)
  const totalAcum = plantas.reduce((s, p) => s + (p.kpi_realtime?.energia_total_kwh ?? 0), 0)
  const potActual = plantas.reduce((s, p) => s + (p.kpi_realtime?.potencia_actual_kw ?? 0), 0)
  const totalAlarmas = plantas.reduce((s, p) => s + (Number(p.alarmas_activas) || 0), 0)
  const defectuosas = plantas.filter(p => p.estado === 'defectuoso' || p.estado === 'desconectado').length

  const stats = [
    { label: 'Potencia actual', value: fmt(potActual, 2, ' kW'), icon: <Zap className="w-5 h-5 text-yellow-500" /> },
    { label: 'Energía hoy', value: fmt(totalHoy, 1, ' kWh'), icon: <Sun className="w-5 h-5 text-orange-400" /> },
    { label: 'Energía mes', value: fmt(totalMes / 1000, 2, ' MWh'), icon: <Sun className="w-5 h-5 text-amber-500" /> },
    { label: 'Acumulada total', value: fmt(totalAcum / 1000, 1, ' MWh'), icon: <Battery className="w-5 h-5 text-green-500" /> },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="shrink-0">{s.icon}</div>
          <div>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-lg font-semibold text-slate-800">{s.value}</p>
          </div>
        </div>
      ))}
      {totalAlarmas > 0 && (
        <div className="col-span-2 md:col-span-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{totalAlarmas} alarma{totalAlarmas > 1 ? 's' : ''} activa{totalAlarmas > 1 ? 's' : ''}</strong>
            {defectuosas > 0 && ` · ${defectuosas} planta${defectuosas > 1 ? 's' : ''} con incidencia`}
          </span>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────
// Tarjeta de planta individual
// ──────────────────────────────

function PlantaCard({ planta, expanded, onToggle }: {
  planta: FVPlanta
  expanded: boolean
  onToggle: () => void
}) {
  const badge = ESTADO_BADGE[planta.estado] ?? ESTADO_BADGE.desconocido
  const kpi = planta.kpi_realtime

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Cabecera siempre visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
      >
        <Sun className="w-8 h-8 text-amber-400 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 truncate">{planta.nombre}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
              {badge.icon}
              {badge.label}
            </span>
            {(Number(planta.alarmas_activas) || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3" />
                {planta.alarmas_activas} alarma{Number(planta.alarmas_activas) > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {planta.capacidad_kwp ? `${planta.capacidad_kwp} kWp` : 'Capacidad desconocida'}
            {planta.tiene_bateria && ' · Batería'}
            {planta.pais && ` · ${planta.pais}`}
          </div>
        </div>

        {/* KPIs compactos en cabecera */}
        {kpi && (
          <div className="hidden md:flex items-center gap-6 text-right">
            <div>
              <p className="text-xs text-slate-400">Hoy</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(kpi.energia_hoy_kwh, 1, ' kWh')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Mes</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(kpi.energia_mes_kwh, 0, ' kWh')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Potencia</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(kpi.potencia_actual_kw, 2, ' kW')}</p>
            </div>
          </div>
        )}

        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Panel expandido */}
      {expanded && <PlantaDetalle plantaId={planta.id} />}
    </div>
  )
}

// ──────────────────────────────
// Detalle expandido de planta
// ──────────────────────────────

function PlantaDetalle({ plantaId }: { plantaId: string }) {
  const { data: alarmas, isLoading: loadingAlarmas } = useAlarmasPorPlanta(plantaId)
  const { data: kpisData, isLoading: loadingKpi } = useKpiDiarioPorPlanta(plantaId, 30)
  const { data: dispositivos } = useDispositivosPorPlanta(plantaId)
  const [seccion, setSeccion] = useState<'produccion' | 'alarmas' | 'dispositivos'>('produccion')

  return (
    <div className="border-t border-slate-100">
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-slate-100 bg-slate-50 px-5">
        {([
          ['produccion', 'Producción 30d'],
          ['alarmas', `Alarmas${alarmas?.length ? ` (${alarmas.length})` : ''}`],
          ['dispositivos', 'Dispositivos'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSeccion(key)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              seccion === key
                ? 'border-valere-blue text-valere-blue font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {seccion === 'produccion' && (
          <GraficoProduccion kpis={kpisData ?? []} loading={loadingKpi} />
        )}
        {seccion === 'alarmas' && (
          <TablaAlarmas alarmas={alarmas ?? []} loading={loadingAlarmas} />
        )}
        {seccion === 'dispositivos' && (
          <TablaDispositivos dispositivos={dispositivos ?? []} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────
// Gráfico de producción
// ──────────────────────────────

function GraficoProduccion({ kpis, loading }: { kpis: { fecha: string; energia_kwh: number | null }[]; loading: boolean }) {
  if (loading) return <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando…</div>
  if (!kpis.length) {
    return <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Sin datos de producción</div>
  }

  const data = kpis.map(k => ({
    fecha: k.fecha.slice(5), // MM-DD
    kWh: k.energia_kwh ?? 0,
  }))

  const totalMes = kpis.reduce((s, k) => s + (k.energia_kwh ?? 0), 0)

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-800">{fmt(totalMes, 1, ' kWh')}</span>
        <span className="text-sm text-slate-500">últimos 30 días</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            interval={4}
          />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
          <Tooltip
            formatter={(v) => [`${Number(v ?? 0).toFixed(1)} kWh`, 'Energía']}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="kWh" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ──────────────────────────────
// Tabla de alarmas
// ──────────────────────────────

function TablaAlarmas({ alarmas, loading }: { alarmas: FVAlarma[]; loading: boolean }) {
  if (loading) return <div className="py-6 text-center text-slate-400 text-sm">Cargando…</div>

  if (!alarmas.length) {
    return (
      <div className="py-8 text-center">
        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">Sin alarmas activas</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alarmas.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERIDAD_COLOR[a.severidad] ?? SEVERIDAD_COLOR.desconocida}`}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{a.descripcion || `Código: ${a.codigo}`}</p>
            {a.dispositivo && <p className="text-xs opacity-75 mt-0.5">Dispositivo: {a.dispositivo}</p>}
            <p className="text-xs opacity-60 mt-0.5">Desde: {fmtDate(a.iniciada_en)}</p>
          </div>
          <span className="text-xs font-medium capitalize shrink-0">{a.severidad}</span>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────
// Tabla de dispositivos
// ──────────────────────────────

function TablaDispositivos({ dispositivos }: { dispositivos: { tipo: string; nombre: string | null; modelo: string | null; numero_serie: string | null; estado: string }[] }) {
  const TIPO_ICON: Record<string, string> = {
    inversor: '⚡',
    bateria: '🔋',
    optimizador: '🔧',
    smart_meter: '📊',
    otro: '⚙️',
  }

  if (!dispositivos.length) {
    return <div className="py-6 text-center text-slate-400 text-sm">Sin dispositivos registrados</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Tipo</th>
            <th className="text-left py-2 pr-4">Nombre</th>
            <th className="text-left py-2 pr-4">Modelo</th>
            <th className="text-left py-2 pr-4">S/N</th>
            <th className="text-left py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {dispositivos.map((d, i) => {
            const b = ESTADO_BADGE[d.estado] ?? ESTADO_BADGE.desconocido
            return (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium">
                  {TIPO_ICON[d.tipo] || '⚙️'} <span className="capitalize">{d.tipo}</span>
                </td>
                <td className="py-2 pr-4 text-slate-600">{d.nombre || '—'}</td>
                <td className="py-2 pr-4 text-slate-500 text-xs">{d.modelo || '—'}</td>
                <td className="py-2 pr-4 text-slate-400 text-xs font-mono">{d.numero_serie || '—'}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.color}`}>
                    {b.icon}
                    {b.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
