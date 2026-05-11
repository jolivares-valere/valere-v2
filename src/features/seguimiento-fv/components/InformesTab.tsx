import { FileText, CheckCircle2, Clock, Send, Eye, Leaf } from 'lucide-react'
import type { FxInforme } from '../fixtures'

function fmt(n: number, dec = 0, suffix = '') {
  return n.toFixed(dec) + suffix
}

const ESTADO_CFG = {
  borrador:           { label: 'Borrador',           color: 'bg-slate-100 text-slate-700',   Icon: FileText    },
  revision_pendiente: { label: 'Revisión pendiente', color: 'bg-amber-100 text-amber-800',   Icon: Clock       },
  aprobado:           { label: 'Aprobado',           color: 'bg-green-100 text-green-800',   Icon: CheckCircle2},
  enviado:            { label: 'Enviado',            color: 'bg-blue-100 text-blue-800',     Icon: Send        },
}

interface Props {
  informes: FxInforme[]
}

export default function InformesTab({ informes }: Props) {
  const mesLabel = (mes: string) => {
    const [y, m] = mes.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-5">

      {/* Explicación */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <p className="font-semibold mb-1">Informes mensuales de producción / autoconsumo</p>
        <p className="text-blue-700 text-xs">
          El sync genera un borrador el día 1 de cada mes con los datos acumulados. Desde aquí
          puedes revisar y aprobar el informe antes de enviarlo al cliente. La generación de PDF
          se implementará en la próxima fase.
        </p>
      </div>

      {/* Tarjetas de informe */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {informes.map(inf => {
          const cfg = ESTADO_CFG[inf.estado]
          const ratioAutocons = inf.energia_total_kwh > 0
            ? Math.round((inf.autoconsumo_kwh / inf.energia_total_kwh) * 100)
            : 0

          return (
            <div key={inf.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{inf.empresa_nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{mesLabel(inf.mes)}</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.color}`}>
                    <cfg.Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Métricas */}
              <div className="px-5 py-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Producción total</p>
                  <p className="font-bold text-slate-800">{fmt(inf.energia_total_kwh)} kWh</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Excedentes a red</p>
                  <p className="font-bold text-blue-600">{fmt(inf.excedentes_kwh)} kWh</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Autoconsumo</p>
                  <p className="font-bold text-green-600">{fmt(inf.autoconsumo_kwh)} kWh</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Ratio autoconsumo</p>
                  <p className="font-bold text-green-600">{ratioAutocons}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Ahorro estimado</p>
                  <p className="font-bold text-slate-700">{fmt(inf.ahorro_estimado_eur, 0)} €</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-green-500" />
                  <div>
                    <p className="text-xs text-slate-400">CO₂ evitado</p>
                    <p className="font-bold text-slate-700">{fmt(inf.co2_evitado_kg)} kg</p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  Ver detalle
                </button>
                {inf.estado === 'borrador' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Enviar a revisión
                  </button>
                )}
                {inf.estado === 'revision_pendiente' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprobar
                  </button>
                )}
                {inf.estado === 'aprobado' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <Send className="w-3.5 h-3.5" />
                    Enviar al cliente
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {informes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No hay informes generados aún</p>
          <p className="text-slate-300 text-xs mt-1">El primer borrador se genera automáticamente el día 1 del próximo mes</p>
        </div>
      )}
    </div>
  )
}
