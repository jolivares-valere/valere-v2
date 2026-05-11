import { AlertTriangle, CheckCircle2, WifiOff, Zap, Sun, ArrowLeftRight, Clock } from 'lucide-react'
import type { FxPlanta, FxIncidencia, FxComparativa, FxCredencial } from '../fixtures'

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

const TIPO_LABEL: Record<string, string> = {
  alarma_critica:    'Alarma crítica',
  sin_datos:         'Sin datos',
  descuadre_datadis: 'Descuadre Datadis',
  credencial_error:  'Credencial error',
  produccion_anomala:'Producción anómala',
}

const SEV_COLOR: Record<string, string> = {
  critica: 'bg-red-100 text-red-800 border-red-200',
  mayor:   'bg-orange-100 text-orange-800 border-orange-200',
  menor:   'bg-yellow-100 text-yellow-800 border-yellow-200',
}

const ESTADO_COMP: Record<string, { label: string; color: string }> = {
  ok:        { label: 'OK',       color: 'text-green-600' },
  revisar:   { label: 'Revisar',  color: 'text-yellow-600' },
  critico:   { label: 'Crítico',  color: 'text-red-600' },
  sin_datos: { label: 'Sin datos',color: 'text-slate-400' },
}

interface Props {
  plantas:     FxPlanta[]
  incidencias: FxIncidencia[]
  comparativa: FxComparativa[]
  credenciales: FxCredencial[]
}

export default function ResumenTab({ plantas, incidencias, comparativa, credenciales }: Props) {
  const operativas    = plantas.filter(p => p.estado === 'normal').length
  const conIncidencia = plantas.filter(p => p.estado !== 'normal').length
  const potenciaTotal = plantas.reduce((s, p) => s + (p.kpi_realtime?.potencia_actual_kw ?? 0), 0)
  const energiaHoy    = plantas.reduce((s, p) => s + (p.kpi_realtime?.energia_hoy_kwh   ?? 0), 0)
  const energiaMes    = plantas.reduce((s, p) => s + (p.kpi_realtime?.energia_mes_kwh   ?? 0), 0)

  const incAbiertas = incidencias.filter(i => !i.resuelta)
  const nCriticas   = incAbiertas.filter(i => i.severidad === 'critica').length
  const descuadres  = comparativa.filter(c => c.estado === 'critico' || c.estado === 'revisar')

  const nCredError      = credenciales.filter(c => !!c.ultimo_error).length
  const nCookiesUrg     = credenciales.filter(c => {
    const exp = c.cookies_expires_at
    return exp && (new Date(exp).getTime() - Date.now()) < 3 * 86400000
  }).length
  const acciones = [
    nCredError   > 0 && { tipo: 'error',   texto: `${nCredError} credencial${nCredError > 1 ? 'es' : ''} con error — sync interrumpido para esas plantas` },
    nCookiesUrg  > 0 && { tipo: 'warning', texto: `${nCookiesUrg} credencial${nCookiesUrg > 1 ? 'es' : ''} con cookies a punto de expirar` },
    nCriticas    > 0 && { tipo: 'error',   texto: `${nCriticas} incidencia${nCriticas > 1 ? 's' : ''} critica${nCriticas > 1 ? 's' : ''} abierta${nCriticas > 1 ? 's' : ''}` },
    descuadres.filter(d => d.estado === 'critico').length > 0 && { tipo: 'warning', texto: `${descuadres.filter(d => d.estado === 'critico').length} descuadre${descuadres.filter(d => d.estado === 'critico').length > 1 ? 's' : ''} critico${descuadres.filter(d => d.estado === 'critico').length > 1 ? 's' : ''} vs Datadis` },
  ].filter(Boolean) as { tipo: string; texto: string }[]

  return (
    <div className="space-y-6">

      {/* Acciones requeridas */}
      {acciones.length > 0 && (
        <div className="flex flex-col gap-2">
          {acciones.map(({ tipo, texto }) => (
            <div key={texto} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${
              tipo === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${tipo === 'error' ? 'text-red-500' : 'text-orange-500'}`} />
              {texto}
            </div>
          ))}
        </div>
      )}

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total plantas',   value: plantas.length,                     icon: Sun,          color: 'text-amber-500',  bg: 'bg-amber-50' },
          { label: 'Operativas',      value: operativas,                          icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Con incidencia',  value: conIncidencia,                       icon: WifiOff,      color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'Potencia actual', value: fmt(potenciaTotal, 1, ' kW'),        icon: Zap,          color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Energía hoy',     value: fmt(energiaHoy, 0, ' kWh'),          icon: Sun,          color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Energía mes',     value: fmt(energiaMes / 1000, 1, ' MWh'),   icon: ArrowLeftRight,color:'text-valere-blue', bg: 'bg-blue-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Incidencias abiertas */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-slate-800 text-sm">Incidencias abiertas</span>
            </div>
            {nCriticas > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {nCriticas} crítica{nCriticas > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {incAbiertas.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin incidencias abiertas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {incAbiertas.map(inc => (
                <div key={inc.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEV_COLOR[inc.severidad] ?? ''}`}>
                      {inc.severidad.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{inc.planta_nombre}</p>
                      <p className="text-xs text-slate-500 truncate">{TIPO_LABEL[inc.tipo]} · {inc.empresa_nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{inc.descripcion.slice(0, 90)}…</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      {fmtDate(inc.detectada_en).split(',')[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado de plantas */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-800 text-sm">Estado de plantas</span>
          </div>
          <div className="divide-y divide-slate-50">
            {plantas.map(p => {
              const iconProps = p.estado === 'normal'
                ? { Icon: CheckCircle2, color: 'text-green-500' }
                : p.estado === 'desconectado'
                ? { Icon: WifiOff, color: 'text-slate-400' }
                : { Icon: AlertTriangle, color: 'text-red-500' }
              return (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <iconProps.Icon className={`w-4 h-4 shrink-0 ${iconProps.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.empresa?.nombre ?? 'Sin asignar'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-700">
                      {fmt(p.kpi_realtime?.energia_hoy_kwh, 0, ' kWh')}
                    </p>
                    <p className="text-xs text-slate-400">{fmt(p.kpi_realtime?.potencia_actual_kw, 1, ' kW')} ahora</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Comparativa Datadis — resumen rápido */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-valere-blue" />
          <span className="font-semibold text-slate-800 text-sm">Comparativa FV vs Datadis — mes actual</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Planta', 'Producción FV', 'Excedente FV', 'Excedente Datadis', 'Diferencia', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {comparativa.map(c => {
                const cfg = ESTADO_COMP[c.estado]
                return (
                  <tr key={c.planta_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{c.planta_nombre}</p>
                      <p className="text-xs text-slate-400">{c.empresa_nombre}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{c.produccion_fv_kwh ? `${c.produccion_fv_kwh} kWh` : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.excedente_fv_kwh  ? `${c.excedente_fv_kwh} kWh`  : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.excedente_datadis_kwh != null ? `${c.excedente_datadis_kwh} kWh` : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.diferencia_pct != null ? `${c.diferencia_pct.toFixed(1)} %` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
