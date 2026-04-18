import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import {
  useIncidencias,
  useIncidenciasKPI,
  useCreateIncidencia,
  useUpdateIncidencia,
  useDeleteIncidencia,
  fetchIncidenciasForExport,
} from './api'
import type { IncidenciaConEmpresa } from './api'
import IncidenciaForm from './components/IncidenciaForm'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ExportButton from '../../core/components/ExportButton'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import { formatDate } from '../../core/utils/dates'
import type { IncidenciaInsert, EstadoIncidencia, PrioridadIncidencia, TipoIncidencia } from '../../core/types/entities'

type EditingState = IncidenciaConEmpresa | 'new' | null

const ESTADO_BADGE: Record<EstadoIncidencia, string> = {
  abierta: 'bg-blue-100 text-blue-800',
  en_gestion: 'bg-indigo-100 text-indigo-800',
  pendiente_cliente: 'bg-amber-100 text-amber-800',
  pendiente_comercializadora: 'bg-orange-100 text-orange-800',
  resuelta: 'bg-green-100 text-green-800',
  cerrada: 'bg-slate-100 text-slate-600',
}

const PRIORIDAD_BADGE: Record<PrioridadIncidencia, string> = {
  baja: 'bg-slate-100 text-slate-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-800',
  critica: 'bg-red-100 text-red-800',
}

const ESTADO_LABEL: Record<EstadoIncidencia, string> = {
  abierta: 'Abierta',
  en_gestion: 'En gestión',
  pendiente_cliente: 'Pte. cliente',
  pendiente_comercializadora: 'Pte. comercializadora',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
}

const PRIORIDAD_LABEL: Record<PrioridadIncidencia, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const TIPO_LABEL: Record<TipoIncidencia, string> = {
  facturacion: 'Facturación',
  cambio_comercializadora: 'Cambio comercializadora',
  corte_suministro: 'Corte suministro',
  potencia: 'Potencia',
  acceso_red: 'Acceso red',
  otro: 'Otro',
}

export default function IncidenciasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterEstado = (searchParams.get('estado') as EstadoIncidencia) || undefined
  const filterPrioridad = (searchParams.get('prioridad') as PrioridadIncidencia) || undefined
  const filterTipo = (searchParams.get('tipo') as TipoIncidencia) || undefined

  const { data, isLoading } = useIncidencias({
    filter: { estado: filterEstado, prioridad: filterPrioridad, tipo: filterTipo },
  })
  const kpi = useIncidenciasKPI()
  const createMut = useCreateIncidencia()
  const updateMut = useUpdateIncidencia()
  const deleteMut = useDeleteIncidencia()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const onSubmit = async (values: IncidenciaInsert) => {
    if (editing && editing !== 'new') {
      await updateMut.mutateAsync({ id: editing.id, patch: values })
    } else {
      await createMut.mutateAsync(values)
    }
    setEditing(null)
  }

  const onDeleteConfirmed = async () => {
    if (!confirmDeleteId) return
    await deleteMut.mutateAsync(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const submitting = createMut.isPending || updateMut.isPending
  const lista = data?.data ?? []
  const aBorrar = lista.find((i) => i.id === confirmDeleteId)
  const k = kpi.data

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incidencias</h1>
          <p className="text-sm text-slate-500">{lista.length} registros</p>
        </div>
        <div className="flex gap-2">
          <ExportButton<IncidenciaConEmpresa>
            filename="incidencias"
            fetchRows={() => fetchIncidenciasForExport({ estado: filterEstado, tipo: filterTipo, prioridad: filterPrioridad })}
            columns={[
              { header: 'Empresa', value: (i) => i.empresa?.nombre },
              { header: 'NIF', value: (i) => i.empresa?.nif },
              { header: 'Título', value: (i) => i.titulo },
              { header: 'Tipo', value: (i) => TIPO_LABEL[i.tipo] },
              { header: 'Estado', value: (i) => ESTADO_LABEL[i.estado] },
              { header: 'Prioridad', value: (i) => PRIORIDAD_LABEL[i.prioridad] },
              { header: 'CUPS', value: (i) => i.cups },
              { header: 'Asignado', value: (i) => i.asignado?.full_name },
              { header: 'Apertura', value: (i) => formatDate(i.fecha_apertura) },
              { header: 'Límite', value: (i) => formatDate(i.fecha_limite) },
              { header: 'Importe reclamado', value: (i) => i.importe_reclamado },
              { header: 'Importe recuperado', value: (i) => i.importe_recuperado },
            ]}
          />
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nueva incidencia
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {k && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Abiertas" value={k.abiertas} color="text-blue-700" />
          <KpiCard label="Críticas" value={k.criticas} color="text-red-700" />
          <KpiCard label="Alta prioridad" value={k.altas} color="text-orange-700" />
          <KpiCard label="Vencidas" value={k.vencidas} color="text-rose-700" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filterEstado ?? ''}
          onChange={(e) => setFilter('estado', e.target.value || null)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_LABEL) as EstadoIncidencia[]).map((e) => (
            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
          ))}
        </select>
        <select
          value={filterPrioridad ?? ''}
          onChange={(e) => setFilter('prioridad', e.target.value || null)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todas las prioridades</option>
          {(Object.keys(PRIORIDAD_LABEL) as PrioridadIncidencia[]).map((p) => (
            <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>
          ))}
        </select>
        <select
          value={filterTipo ?? ''}
          onChange={(e) => setFilter('tipo', e.target.value || null)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(TIPO_LABEL) as TipoIncidencia[]).map((t) => (
            <option key={t} value={t}>{TIPO_LABEL[t]}</option>
          ))}
        </select>
        {(filterEstado || filterPrioridad || filterTipo) && (
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
          >
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table / Loading / Empty */}
      {isLoading ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Apertura</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="mb-3 text-sm text-slate-500">Sin incidencias registradas</p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Crear la primera
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Apertura</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {inc.empresa?.nombre ?? '—'}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-700">
                      {inc.titulo}
                      {inc.asignado && (
                        <div className="text-xs text-slate-400">{inc.asignado.full_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{TIPO_LABEL[inc.tipo]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[inc.estado]}`}>
                        {ESTADO_LABEL[inc.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRIORIDAD_BADGE[inc.prioridad]}`}>
                        {PRIORIDAD_LABEL[inc.prioridad]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(inc.fecha_apertura)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(inc)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(inc.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {lista.map((inc) => (
              <li key={inc.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{inc.empresa?.nombre ?? '—'}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-700">{inc.titulo}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[inc.estado]}`}>
                        {ESTADO_LABEL[inc.estado]}
                      </span>
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${PRIORIDAD_BADGE[inc.prioridad]}`}>
                        {PRIORIDAD_LABEL[inc.prioridad]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(inc.fecha_apertura)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditing(inc)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(inc.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Side panel */}
      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditing(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing === 'new' ? 'Nueva incidencia' : 'Editar incidencia'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <IncidenciaForm
                defaultValues={editing === 'new' ? undefined : editing}
                onSubmit={onSubmit}
                onCancel={() => setEditing(null)}
                submitting={submitting}
              />
            </div>
          </div>
        </>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Eliminar incidencia"
        message={aBorrar ? `¿Seguro que quieres eliminar "${aBorrar.titulo}"? (soft delete)` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={onDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
