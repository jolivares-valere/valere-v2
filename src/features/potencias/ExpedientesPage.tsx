import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Folder, Plus, Search, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import EmptyState from '@/core/components/EmptyState'
import { SkeletonRow } from '@/components/ui/Skeleton'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ExpedienteRow {
  id: string
  empresa_id: string
  cups_id: string
  anio: number
  estado: string
  tipo_normativa: string
  ciclos_realizados: number
  notas: string | null
  created_at: string
  empresas: { nombre: string } | null
  cups: { codigo_cups: string; ciudad_suministro: string | null } | null
  ciclos: { estado: string; numero_ciclo: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CICLO_ESTADOS: Record<string, { label: string; color: string }> = {
  bajada_pendiente: { label: 'Bajada pendiente',  color: 'bg-blue-100 text-blue-800' },
  bajada_activa:    { label: 'Bajada activa',      color: 'bg-amber-100 text-amber-800' },
  bajada_aprobada:  { label: 'Bajada aprobada',    color: 'bg-green-100 text-green-800' },
  subida_pendiente: { label: 'Subida pendiente',   color: 'bg-purple-100 text-purple-800' },
  subida_activa:    { label: 'Subida activa',      color: 'bg-orange-100 text-orange-800' },
  completado:       { label: 'Completado',          color: 'bg-emerald-100 text-emerald-800' },
  cancelado:        { label: 'Cancelado',           color: 'bg-red-100 text-red-800' },
}

const RDL_CLOSE = new Date('2026-12-31')

function diasRDL(): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((RDL_CLOSE.getTime() - hoy.getTime()) / 86400000))
}

function alertaRDL(dias: number) {
  if (dias <= 10)  return { label: 'URGENTE',  color: 'bg-red-100 text-red-700' }
  if (dias <= 15)  return { label: 'ATENCIÓN', color: 'bg-orange-100 text-orange-700' }
  if (dias <= 21)  return { label: 'PREPARAR', color: 'bg-yellow-100 text-yellow-700' }
  return null
}

function CicloEstadoBadge({ estado }: { estado: string }) {
  const cfg = CICLO_ESTADOS[estado] ?? { label: estado, color: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ExpedientesPage() {
  const [search, setSearch]           = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'cancelado'>('todos')
  const dias = useMemo(() => diasRDL(), [])

  const { data, loading, refetch } = useSupabaseQuery<ExpedienteRow>({
    table: 'expedientes',
    select: `
      id, empresa_id, cups_id, anio, estado, tipo_normativa,
      ciclos_realizados, notas, created_at,
      empresas ( nombre ),
      cups ( codigo_cups, ciudad_suministro ),
      ciclos ( estado, numero_ciclo )
    `,
    order: { column: 'created_at', ascending: false },
  })

  const filtered = useMemo(() => {
    return data.filter(e => {
      if (filtroEstado !== 'todos' && e.estado !== filtroEstado) return false
      if (search) {
        const q = search.toLowerCase()
        const empresa = e.empresas?.nombre?.toLowerCase() ?? ''
        const cups = e.cups?.codigo_cups?.toLowerCase() ?? ''
        if (!empresa.includes(q) && !cups.includes(q)) return false
      }
      return true
    })
  }, [data, filtroEstado, search])

  // Contadores
  const activos    = data.filter(e => e.estado === 'activo').length
  const cancelados = data.filter(e => e.estado === 'cancelado').length

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Expedientes</h1>
            <p className="text-sm text-slate-500">
              Gestión de cambios de potencia — RDL 7/2026 ·{' '}
              <span className="font-semibold text-blue-700">{dias} días restantes</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              title="Actualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-[#1e3a6e] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d58] transition-colors">
              <Plus className="h-4 w-4" />
              Nuevo expediente
            </button>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filtroEstado === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Folder className="h-3 w-3" /> Todos ({data.length})
          </button>
          <button
            onClick={() => setFiltroEstado('activo')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filtroEstado === 'activo' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <Clock className="h-3 w-3" /> Activos ({activos})
          </button>
          <button
            onClick={() => setFiltroEstado('cancelado')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filtroEstado === 'cancelado' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          >
            <XCircle className="h-3 w-3" /> Cancelados ({cancelados})
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Buscador */}
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empresa o CUPS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Empresa</th>
                <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 md:table-cell">CUPS</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Estado ciclo</th>
                <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 lg:table-cell">Normativa</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Alerta RDL</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Expediente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<Folder className="h-8 w-8 text-slate-300" />}
                      title="Sin expedientes"
                      description="No hay expedientes que coincidan con los filtros."
                    />
                  </td>
                </tr>
              ) : filtered.map(exp => {
                const ultimoCiclo = exp.ciclos?.sort((a, b) => b.numero_ciclo - a.numero_ciclo)[0]
                const alerta = alertaRDL(dias)
                const esActivo = exp.estado === 'activo'

                return (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {exp.empresas?.nombre ?? '—'}
                      </div>
                      <div className="text-xs text-slate-400">{exp.anio}</div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="font-mono text-xs text-slate-600">
                        {exp.cups?.codigo_cups ?? '—'}
                      </div>
                      <div className="text-xs text-slate-400">{exp.cups?.ciudad_suministro ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      {ultimoCiclo
                        ? <CicloEstadoBadge estado={ultimoCiclo.estado} />
                        : <span className="text-xs text-slate-400">Sin ciclo</span>
                      }
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-xs text-slate-600">{exp.tipo_normativa ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {esActivo && alerta ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${alerta.color}`}>
                          <AlertTriangle className="h-3 w-3" />
                          {alerta.label}
                        </span>
                      ) : esActivo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/potencias/expedientes/${exp.id}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        Ver →
                      </Link>
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
