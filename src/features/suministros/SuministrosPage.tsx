import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw } from 'lucide-react'
import { fetchAllSuministros } from './api'
import SuministrosTable from './components/SuministrosTable'

/** Página global de Suministros (CUPS) para el menú del CRM comercial. */
export default function SuministrosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suministros-todos'],
    queryFn: fetchAllSuministros,
    staleTime: 60_000,
  })

  const empresas = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; nombre: string }[] = []
    for (const r of rows) {
      if (!seen.has(r.empresa_id)) {
        seen.add(r.empresa_id)
        list.push({ id: r.empresa_id, nombre: r.empresa_nombre })
      }
    }
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [rows])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return rows.filter((r) => {
      const matchBusqueda =
        !q ||
        r.codigo_cups.toLowerCase().includes(q) ||
        r.empresa_nombre.toLowerCase().includes(q) ||
        (r.direccion_suministro ?? '').toLowerCase().includes(q) ||
        (r.comercializadora_actual ?? '').toLowerCase().includes(q)
      const matchEmpresa = !filtroEmpresa || r.empresa_id === filtroEmpresa
      return matchBusqueda && matchEmpresa
    })
  }, [rows, busqueda, filtroEmpresa])

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Suministros</h1>
          <p className="mt-1 text-slate-500">
            Puntos de suministro (CUPS) — {isLoading ? '…' : `${filtrados.length} de ${rows.length}`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          title="Actualizar lista"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por CUPS, empresa, dirección, comercializadora…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
          />
        </div>
        <select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {error ? (
          <p className="p-4 text-sm text-red-600">Error al cargar los suministros.</p>
        ) : isLoading ? (
          <p className="p-4 text-sm text-slate-500">Cargando…</p>
        ) : (
          <SuministrosTable rows={filtrados} showEmpresa />
        )}
      </div>
    </div>
  )
}
