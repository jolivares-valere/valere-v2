import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { fetchSuministrosByEmpresa, fetchCurvaUltimaFecha } from '../api'
import SuministrosTable from './SuministrosTable'
import CurvaConsumo from './CurvaConsumo'
import { useDatadisIncidencias } from '../../datadis/incidencias.api'

/** Pestaña "Suministros" dentro de la ficha de empresa del CRM comercial. */
export default function SuministrosTab({ empresaId }: { empresaId: string }) {
  // PR-4.1: CUPS cuya curva está abierta bajo la tabla (null = cerrada).
  const [curvaAbierta, setCurvaAbierta] = useState<{ id: string; codigo: string } | null>(null)
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['suministros-empresa', empresaId],
    queryFn: () => fetchSuministrosByEmpresa(empresaId),
    staleTime: 60_000,
  })

  // Curva por CUPS (PR-1.5): se lanza cuando ya conocemos los CUPS.
  const cupsIds = rows.map((r) => r.id)
  const curvaQuery = useQuery({
    queryKey: ['suministros-curva', empresaId, cupsIds.length],
    enabled: cupsIds.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchCurvaUltimaFecha(cupsIds),
  })

  // Incidencias Datadis de esta empresa (mismo origen que la alarma del Dashboard).
  const incidencias = useDatadisIncidencias()
  const grupo = incidencias.data?.grupos.find((g) => g.empresa_id === empresaId)

  return (
    <div className="space-y-3">
      {grupo && grupo.items.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {grupo.items.length} incidencia{grupo.items.length === 1 ? '' : 's'} de datos Datadis
          </p>
          <ul className="space-y-1 text-xs text-red-700">
            {grupo.items.map((i) => (
              <li key={i.id}>
                {i.tipo === 'cups_falta_en_crm' ? 'CUPS autorizado en Datadis que falta en el CRM' : 'Empresa autorizada sin CUPS coincidente'}
                {i.cups_codigo && <span className="ml-1 font-mono">{i.cups_codigo}</span>}
                {i.municipio && <span className="ml-1 text-red-500">({i.municipio})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Puntos de suministro (CUPS)</h3>
        <span className="text-xs text-slate-400">{isLoading ? '…' : `${rows.length} CUPS`}</span>
      </div>
      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600">Error al cargar los suministros.</p>}
      {!isLoading && !error && (
        <SuministrosTable
          rows={rows}
          showEmpresa={false}
          curva={curvaQuery.data ?? {}}
          onVerCurva={(r) => setCurvaAbierta((prev) => (prev?.id === r.id ? null : { id: r.id, codigo: r.codigo_cups }))}
        />
      )}
      {curvaAbierta && (
        <CurvaConsumo
          cupsId={curvaAbierta.id}
          codigoCups={curvaAbierta.codigo}
          onClose={() => setCurvaAbierta(null)}
        />
      )}
    </div>
  )
}
