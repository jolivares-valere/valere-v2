import { AlertTriangle, WifiOff, GitBranch, KeyRound, TrendingDown, CheckCircle2, Clock } from 'lucide-react'
import type { FxIncidencia } from '../fixtures'

function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

function diasDesde(s: string): string {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  return `hace ${diff} días`
}

const TIPO_CFG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  alarma_critica:     { label: 'Alarma técnica',     Icon: AlertTriangle, color: 'text-red-500' },
  sin_datos:          { label: 'Sin datos',           Icon: WifiOff,       color: 'text-slate-500' },
  descuadre_datadis:  { label: 'Descuadre Datadis',  Icon: GitBranch,     color: 'text-orange-500' },
  credencial_error:   { label: 'Error credencial',   Icon: KeyRound,      color: 'text-purple-500' },
  produccion_anomala: { label: 'Producción anómala', Icon: TrendingDown,  color: 'text-yellow-600' },
}

const SEV_BADGE: Record<string, string> = {
  critica: 'bg-red-100 text-red-800 border-red-200',
  mayor:   'bg-orange-100 text-orange-800 border-orange-200',
  menor:   'bg-yellow-100 text-yellow-800 border-yellow-200',
}

interface Props {
  incidencias: FxIncidencia[]
}

export default function IncidenciasTab({ incidencias }: Props) {
  const abiertas  = incidencias.filter(i => !i.resuelta)
  const resueltas = incidencias.filter(i => i.resuelta)

  return (
    <div className="space-y-5">

      {/* Contadores */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Abiertas',           value: abiertas.length,                                              color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'Críticas / mayores', value: abiertas.filter(i => i.severidad !== 'menor').length,         color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Descuadres Datadis', value: abiertas.filter(i => i.tipo === 'descuadre_datadis').length,  color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Resueltas',          value: resueltas.length,                                             color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-200 rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Listado */}
      <div className="space-y-3">
        {abiertas.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Sin incidencias abiertas — todo operativo</p>
          </div>
        ) : abiertas.map(inc => {
          const tipoCfg = TIPO_CFG[inc.tipo] ?? TIPO_CFG.alarma_critica
          return (
            <div
              key={inc.id}
              className={`bg-white border rounded-xl p-5 ${
                inc.severidad === 'critica' ? 'border-red-200 shadow-sm shadow-red-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icono de tipo */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  inc.severidad === 'critica' ? 'bg-red-50' : inc.severidad === 'mayor' ? 'bg-orange-50' : 'bg-yellow-50'
                }`}>
                  <tipoCfg.Icon className={`w-5 h-5 ${tipoCfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${SEV_BADGE[inc.severidad] ?? ''}`}>
                      {inc.severidad.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{tipoCfg.label}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-medium">{inc.empresa_nombre}</span>
                  </div>

                  <p className="font-semibold text-slate-800">{inc.planta_nombre}</p>
                  <p className="text-sm text-slate-600 mt-1">{inc.descripcion}</p>
                </div>

                <div className="text-right shrink-0 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {diasDesde(inc.detectada_en)}
                  </div>
                  <p>{fmtDate(inc.detectada_en)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
