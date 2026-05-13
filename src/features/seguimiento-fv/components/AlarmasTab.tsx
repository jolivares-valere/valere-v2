import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Search, Loader2, Sun, RefreshCw } from 'lucide-react'
import { useTodasLasAlarmas } from '../api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function diasDesde(s: string | null | undefined): string {
  if (!s) return '—'
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  return `hace ${diff} d`
}

// ─── Config visual por severidad ──────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; badge: string; dot: string; rowBorder: string }> = {
  critica:     { label: 'Crítica',     badge: 'bg-red-100 text-red-800 border-red-200',       dot: 'bg-red-500',    rowBorder: 'border-red-200 shadow-sm shadow-red-50' },
  mayor:       { label: 'Mayor',       badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', rowBorder: 'border-orange-200' },
  menor:       { label: 'Menor',       badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-400', rowBorder: 'border-slate-200' },
  advertencia: { label: 'Aviso',       badge: 'bg-blue-100 text-blue-800 border-blue-200',    dot: 'bg-blue-400',   rowBorder: 'border-slate-200' },
  desconocida: { label: 'Desconocida', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400',  rowBorder: 'border-slate-200' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AlarmasTab() {
  const { data: alarmas = [], isLoading, refetch, isFetching } = useTodasLasAlarmas()
  const [search,    setSearch]    = useState('')
  const [filtroSev, setFiltroSev] = useState<'todas' | 'critica' | 'mayor' | 'menor' | 'advertencia'>('todas')
  const [filtroEst, setFiltroEst] = useState<'todas' | 'activa' | 'resuelta'>('activa')

  // ── Filtrado ────────────────────────────────────────────────────────────────
  const alarmasFiltradas = alarmas.filter(a => {
    const plantaNombre = a.planta?.nombre_interno ?? a.planta?.nombre ?? ''
    const empresa      = a.planta?.empresa?.nombre ?? ''
    const matchS = !search
      || plantaNombre.toLowerCase().includes(search.toLowerCase())
      || empresa.toLowerCase().includes(search.toLowerCase())
      || (a.descripcion ?? '').toLowerCase().includes(search.toLowerCase())
      || (a.codigo ?? '').toLowerCase().includes(search.toLowerCase())
    const matchSev = filtroSev === 'todas' || a.severidad === filtroSev
    const matchEst = filtroEst === 'todas'
      ? true
      : filtroEst === 'activa' ? a.activa : !a.activa
    return matchS && matchSev && matchEst
  })

  // ── Contadores ──────────────────────────────────────────────────────────────
  const activas   = alarmas.filter(a => a.activa)
  const criticas  = activas.filter(a => a.severidad === 'critica')
  const mayores   = activas.filter(a => a.severidad === 'mayor')
  const resueltas = alarmas.filter(a => !a.activa)

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando alarmas FusionSolar…
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* KPIs rápidos */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Activas',   value: activas.length,   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
          { label: 'Críticas',  value: criticas.length,  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Mayores',   value: mayores.length,   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
          { label: 'Resueltas', value: resueltas.length, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Buscador */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar planta, empresa, descripción…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue/20"
          />
        </div>

        {/* Filtro estado */}
        <div className="flex gap-1">
          {(['activa', 'todas', 'resuelta'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroEst(f)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                filtroEst === f
                  ? 'bg-valere-blue text-white border-valere-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f === 'activa' ? 'Activas' : f === 'todas' ? 'Todas' : 'Resueltas'}
            </button>
          ))}
        </div>

        {/* Filtro severidad */}
        <div className="flex gap-1">
          {(['todas', 'critica', 'mayor', 'menor', 'advertencia'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFiltroSev(s)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                filtroSev === s
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'todas' ? 'Todas' : (SEV_CFG[s]?.label ?? s)}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Listado de alarmas */}
      {alarmasFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm font-medium">Sin alarmas con esos filtros</p>
          <p className="text-slate-300 text-xs mt-1">
            {alarmas.length === 0
              ? 'No hay alarmas registradas en Supabase — el sync aún no ha detectado ninguna.'
              : `${alarmas.length} alarma${alarmas.length !== 1 ? 's' : ''} en total — cambia los filtros para verlas.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alarmasFiltradas.map(a => {
            const sev      = SEV_CFG[a.severidad] ?? SEV_CFG.desconocida
            const nombre   = a.planta?.nombre_interno ?? a.planta?.nombre ?? '—'
            const empresa  = a.planta?.empresa?.nombre ?? '—'
            const code     = a.planta?.station_code ?? '—'

            return (
              <div
                key={a.id}
                className={`bg-white border rounded-xl px-5 py-4 flex items-start gap-4 ${sev.rowBorder}`}
              >
                {/* Dot + planta */}
                <div className="shrink-0 flex items-center gap-2.5 min-w-[200px]">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sev.dot} ${a.activa ? '' : 'opacity-40'}`} />
                  <div>
                    <p className="font-medium text-slate-800 text-sm leading-tight">{nombre}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Sun className="w-3 h-3 text-amber-400" />
                      <p className="text-xs text-slate-400 font-mono">{code}</p>
                    </div>
                  </div>
                </div>

                {/* Empresa */}
                <div className="shrink-0 min-w-[140px]">
                  <p className="text-xs text-slate-500">{empresa}</p>
                </div>

                {/* Badge severidad + descripción */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sev.badge}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {sev.label}
                    </span>
                    {!a.activa && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Resuelta
                      </span>
                    )}
                    {a.codigo && (
                      <span className="text-[10px] font-mono text-slate-400">#{a.codigo}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 truncate">
                    {a.descripcion ?? 'Sin descripción'}
                  </p>
                  {a.dispositivo && (
                    <p className="text-xs text-slate-400 mt-0.5">Dispositivo: {a.dispositivo}</p>
                  )}
                </div>

                {/* Fechas */}
                <div className="shrink-0 text-right text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {diasDesde(a.iniciada_en)}
                  </div>
                  <p>{fmtDate(a.iniciada_en)}</p>
                  {a.resuelta_en && (
                    <p className="text-green-500">→ {fmtDate(a.resuelta_en)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
