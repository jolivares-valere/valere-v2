import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Info } from 'lucide-react'
import type { FxComparativa } from '../fixtures'

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

const ESTADO_CFG = {
  ok:        { label: 'OK',        Icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-800' },
  revisar:   { label: 'Revisar',   Icon: AlertTriangle,color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200',badge: 'bg-yellow-100 text-yellow-800' },
  critico:   { label: 'Crítico',   Icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-800' },
  sin_datos: { label: 'Sin datos', Icon: MinusCircle,  color: 'text-slate-400',  bg: 'bg-slate-50 border-slate-200',  badge: 'bg-slate-100 text-slate-600' },
}

interface Props {
  comparativa: FxComparativa[]
}

export default function ExcedentesTab({ comparativa }: Props) {
  const nOk       = comparativa.filter(c => c.estado === 'ok').length
  const nRevisar  = comparativa.filter(c => c.estado === 'revisar').length
  const nCritico  = comparativa.filter(c => c.estado === 'critico').length
  const nSinDatos = comparativa.filter(c => c.estado === 'sin_datos').length

  return (
    <div className="space-y-5">

      {/* Aviso informativo */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <p>
          Esta tabla cruza los excedentes reportados por la plataforma FV con los excedentes registrados
          por Datadis. Un descuadre {'>'} 5% indica posible error de medida, CUPS incorrecto o retraso
          en la publicación de Datadis.
        </p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'OK — cuadran', value: nOk,       color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Revisar',      value: nRevisar,   color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Crítico',      value: nCritico,   color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Sin datos',    value: nSinDatos,  color: 'text-slate-500',  bg: 'bg-slate-50'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-200 rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla de comparación */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {[
                  'Cliente', 'Planta', 'CUPS', 'Mes',
                  'Producción FV', 'Excedente FV', 'Excedente Datadis',
                  'Diferencia kWh', 'Diferencia %', 'Estado',
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparativa.map(c => {
                const cfg = ESTADO_CFG[c.estado]
                return (
                  <tr key={c.planta_id} className={`hover:opacity-95 transition-opacity ${c.estado === 'critico' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{c.empresa_nombre}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{c.planta_nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.cups}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.fecha}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{c.produccion_fv_kwh ? `${c.produccion_fv_kwh} kWh` : '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{c.excedente_fv_kwh  ? `${c.excedente_fv_kwh} kWh`  : '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{c.excedente_datadis_kwh != null ? `${c.excedente_datadis_kwh} kWh` : '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${c.diferencia_kwh != null && c.diferencia_kwh > 0 ? cfg.color : 'text-slate-400'}`}>
                      {c.diferencia_kwh != null ? `${c.diferencia_kwh} kWh` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${cfg.color}`}>
                      {c.diferencia_pct != null ? `${fmt(c.diferencia_pct, 1)} %` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg}`}>
                        <cfg.Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda umbrales */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 px-1">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> OK: diferencia &lt; 5%</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Revisar: diferencia 5–15%</span>
        <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-500" /> Crítico: diferencia &gt; 15%</span>
        <span className="flex items-center gap-1.5"><MinusCircle className="w-3.5 h-3.5 text-slate-400" /> Sin datos: planta sin CUPS vinculado o con incidencia</span>
      </div>
    </div>
  )
}
