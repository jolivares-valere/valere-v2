import { useState } from 'react'
import { UserX, Sun, Loader2, FlaskConical } from 'lucide-react'
import { usePlantasSinAsignar } from '../api'
import type { FVPlantaBasica } from '../api'
import AsignarPlantaModal from './AsignarPlantaModal'
import type { FxPlanta } from '../fixtures'

function fmt(n: number | null | undefined, dec = 1, suffix = '') {
  if (n == null) return '—'
  return n.toFixed(dec) + suffix
}

// Adaptar planta fixture a FVPlantaBasica
function adaptarFixturePlanta(p: FxPlanta): FVPlantaBasica {
  return {
    id:               p.id,
    plataforma:       p.plataforma,
    region_url:       null,
    station_code:     p.station_code,
    nombre:           p.nombre,
    nombre_interno:   null,
    nombre_fusionsolar: p.nombre,
    capacidad_kwp:    p.capacidad_kwp,
    estado:           p.estado,
    credencial_id:    p.credencial_id,
    empresa_id:       p.empresa_id,
    cups_id:          null,
    sync_enabled:     true,
  }
}

interface Props {
  fixturasPlantas?: FxPlanta[]   // solo si no hay datos reales
}

export default function SinAsignarTab({ fixturasPlantas }: Props) {
  const [plantaSeleccionada, setPlantaSeleccionada] = useState<FVPlantaBasica | null>(null)

  const { data: plantasReales, isLoading } = usePlantasSinAsignar()

  const usarFixtures = !isLoading && (!plantasReales || plantasReales.length === 0) && !!fixturasPlantas?.length
  const plantas: FVPlantaBasica[] = usarFixtures
    ? (fixturasPlantas ?? []).map(adaptarFixturePlanta)
    : (plantasReales ?? [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Buscando plantas sin asignar...</span>
      </div>
    )
  }

  if (plantas.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
        <Sun className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="font-medium text-slate-500">Todas las plantas tienen cliente asignado</p>
        <p className="text-sm text-slate-400 mt-1">El sync no ha detectado plantas sin vincular</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Modal de asignación */}
      <AsignarPlantaModal
        open={!!plantaSeleccionada}
        onClose={() => setPlantaSeleccionada(null)}
        planta={plantaSeleccionada}
      />

      {/* Aviso demo */}
      {usarFixtures && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <FlaskConical className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Datos de demostración.</strong> Cuando el sync detecte plantas reales sin asignar, aparecerán aquí.
          </span>
        </div>
      )}

      {/* Cabecera */}
      <div>
        <h2 className="text-base font-semibold text-slate-800">
          {plantas.length} planta{plantas.length !== 1 ? 's' : ''} sin cliente asignado
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Detectadas por el sync pero aún no vinculadas a ninguna empresa del CRM.
          Asígnalas manualmente para activar el seguimiento completo.
        </p>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Nombre en portal', 'Código (station_code)', 'Plataforma', 'Capacidad', 'Estado', 'Primera vez vista', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plantas.map(p => {
              const nombrePortal = p.nombre_fusionsolar ?? p.nombre
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{nombrePortal}</p>
                    {p.nombre_interno && (
                      <p className="text-xs text-slate-500 mt-0.5">CRM: {p.nombre_interno}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 bg-slate-50/50">{p.station_code}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{p.plataforma}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(p.capacidad_kwp, 1, ' kWp')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      p.estado === 'normal'       ? 'bg-green-100 text-green-800' :
                      p.estado === 'defectuoso'   ? 'bg-red-100 text-red-800' :
                      p.estado === 'desconectado' ? 'bg-slate-100 text-slate-600' :
                                                    'bg-slate-100 text-slate-500'
                    }`}>
                      {p.estado === 'normal' ? 'Operativa' : p.estado === 'defectuoso' ? 'Con alarma' : p.estado === 'desconectado' ? 'Sin datos' : 'Desconocido'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {/* sin creado_en en tipo básico, usamos placeholder */}
                    Detectada
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPlantaSeleccionada(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <UserX className="w-3 h-3" />
                      Asignar cliente
                    </button>
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
