import { useQuery } from '@tanstack/react-query'
import { fetchSuministrosByEmpresa } from '../api'
import SuministrosTable from './SuministrosTable'

/** Pestaña "Suministros" dentro de la ficha de empresa del CRM comercial. */
export default function SuministrosTab({ empresaId }: { empresaId: string }) {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['suministros-empresa', empresaId],
    queryFn: () => fetchSuministrosByEmpresa(empresaId),
    staleTime: 60_000,
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Puntos de suministro (CUPS)</h3>
        <span className="text-xs text-slate-400">{isLoading ? '…' : `${rows.length} CUPS`}</span>
      </div>
      {isLoading && <p className="text-sm text-slate-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">Error al cargar los suministros.</p>}
      {!isLoading && !error && <SuministrosTable rows={rows} showEmpresa={false} />}
    </div>
  )
}
