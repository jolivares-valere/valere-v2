// ═══════════════════════════════════════════════════════════════════
// IncidenciasDatadisCard — alarma en el Dashboard para incidencias de datos
// detectadas por el worker datadis-sync (CUPS que faltan en el CRM o que no
// coinciden con Datadis). Persistente hasta que se corrige. Al pinchar una
// empresa, lleva a su ficha → pestaña Suministros para corregir.
//
// Si no hay incidencias, no renderiza nada (no molesta).
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ChevronDown, Zap } from 'lucide-react'
import { useDatadisIncidencias } from '../../datadis/incidencias.api'

export default function IncidenciasDatadisCard() {
  const { data, isLoading } = useDatadisIncidencias()
  const [abierto, setAbierto] = useState(true)

  if (isLoading || !data || data.total === 0) return null

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="inline-flex rounded-xl bg-red-100 p-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            Datadis: {data.total} {data.total === 1 ? 'incidencia de datos' : 'incidencias de datos'} en {data.empresas} {data.empresas === 1 ? 'empresa' : 'empresas'}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
            {data.faltan > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                <span className="font-medium text-orange-700">{data.faltan}</span> CUPS por dar de alta
              </span>
            )}
            {data.no_coincide > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                <span className="font-medium text-red-700">{data.no_coincide}</span> CUPS no coinciden
              </span>
            )}
          </div>
        </div>
        {abierto ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
      </button>

      {abierto && (
        <ul className="divide-y divide-red-100 border-t border-red-100 bg-white/60">
          {data.grupos.map((g) => (
            <li key={g.empresa_id}>
              <Link
                to={`/empresas/${g.empresa_id}?tab=suministros`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-white"
              >
                <Zap className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{g.empresa_nombre}</p>
                  <p className="text-xs text-slate-500">
                    {g.no_coincide > 0 && (
                      <span className="text-red-700">{g.no_coincide} CUPS no coincide{g.no_coincide === 1 ? '' : 'n'} · </span>
                    )}
                    {g.faltan > 0 && <span>{g.faltan} por dar de alta · </span>}
                    {g.nif ?? ''}
                  </p>
                </div>
                <span className="text-xs font-medium text-valere-blue-dark">Corregir</span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
