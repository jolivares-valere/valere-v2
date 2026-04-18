import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react'
import {
  useRenovaciones,
  useRenovacionesKPI,
  useCreateRenovacion,
  useUpdateRenovacion,
  useDeleteRenovacion,
  fetchRenovacionesForExport,
} from './api'
import type { RenovacionConRelaciones } from './api'
import RenovacionForm from './components/RenovacionForm'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ExportButton from '../../core/components/ExportButton'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import { formatDate } from '../../core/utils/dates'
import type { RenovacionInsert, EstadoRenovacion, PrioridadRenovacion } from '../../core/types/entities'

type EditingState = RenovacionConRelaciones | 'new' | null

const ESTADO_BADGE: Record<EstadoRenovacion, string> = {
  detectada: 'bg-blue-100 text-blue-800',
  contactado: 'bg-indigo-100 text-indigo-800',
  oferta_enviada: 'bg-amber-100 text-amber-800',
  negociacion: 'bg-orange-100 text-orange-800',
  renovado: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
}

const ESTADO_LABEL: Record<EstadoRenovacion, string> = {
  detectada: 'Detectada',
  contactado: 'Contactado',
  oferta_enviada: 'Oferta enviada',
  negociacion: 'Negociación',
  renovado: 'Renovado',
  perdido: 'Perdido',
}

const PRIORIDAD_BADGE: Record<PrioridadRenovacion, string> = {
  critica: 'bg-red-100 text-red-800',
  alta: 'bg-orange-100 text-orange-800',
  media: 'bg-blue-100 text-blue-700',
  baja: 'bg-slate-100 text-slate-700',
  ok: 'bg-green-100 text-green-700',
}

const PRIORIDAD_LABEL: Record<PrioridadRenovacion, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ok: 'OK',
}

export default function RenovacionesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filterEstado = (searchParams.get('estado') as EstadoRenovacion) || undefined
  const filterPrioridad = (searchParams.get('prioridad') as PrioridadRenovacion) || undefined

  const { data, isLoading } = useRenovaciones({
    filter: { estado: filterEstado, prioridad: filterPrioridad },
  })
  const kpi = useRenovacionesKPI()
  const createMut = useCreateRenovacion()
  const updateMut = useUpdateRenovacion()
  const deleteMut = useDeleteRenovacion()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const onSubmit = async (values: RenovacionInsert) => {
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
  const aBorrar = lista.find((r) => r.id === confirmDeleteId)
  const k = kpi.data

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Renovaciones</h1>
          <p className="text-sm text-slate-500">{lista.length} registros</p>
        </div>
        <div className="flex gap-2">
          <ExportButton<RenovacionConRelaciones>
            filename="renovaciones"
            fetchRows={() => fetchRenovacionesForExport({ estado: filterEstado, prioridad: filterPrioridad })}
            columns={[
              { header: 'Empresa', value: (r) => r.empresa?.nombre },
              { header: 'Nº contrato', value: (r) => r.contrato?.numero_contrato },
              { header: 'Compañía', value: (r) => r.contrato?.compania },
              { header: 'Vencimiento', value: (r) => formatDate(r.fecha_vencimiento_contrato) },
              { header: 'Estado', value: (r) => ESTADO_LABEL[r.estado] },
              { header: 'Prioridad', value: (r) => PRIORIDAD_LABEL[r.prioridad] },
              { header: 'Asignado', value: (r) => r.asignado?.full_name },
              { header: 'Motivo pérdida', value: (r) => r.motivo_perdida },
            ]}
          />
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nueva renovación
          </button>
        </div>
      </div>

      {k && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Activas" value={k.activas} color="text-blue-700" />
          <KpiCard label="Críticas" value={k.criticas} color="text-red-700" />
          <KpiCard label="Renovadas" value={k.renovadas} color="text-green-700" />
          <KpiCard label="Perdidas" value={k.perdidas} color="text-rose-700" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filterEstado ?? ''}
          onChange={(e) => setFilter('estado', e.target.value || null)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_LABEL) as EstadoRenovacion[]).map((e) => (
            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
          ))}
        </select>
        <select
          value={filterPrioridad ?? ''}
          onChange={(e) => setFilter('prioridad', e.target.value || null)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todas las prioridades</option>
          {(Object.keys(PRIORIDAD_LABEL) as PrioridadRenovacion[]).map((p) => (
            <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>
          ))}
        </select>
        {(filterEstado || filterPrioridad) && (
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      {isLoading ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center">
          <RefreshCw className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="mb-3 text-sm text-slate-500">Sin renovaciones registradas</p>
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
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((ren) => (
                  <tr key={ren.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {ren.empresa?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {ren.contrato?.numero_contrato ?? '—'}
                      {ren.contrato?.compania && (
                        <div className="text-slate-400">{ren.contrato.compania}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(ren.fecha_vencimiento_contrato)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[ren.estado]}`}>
                        {ESTADO_LABEL[ren.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PRIORIDAD_BADGE[ren.prioridad]}`}>
                        {PRIORIDAD_LABEL[ren.prioridad]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(ren)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(ren.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-3">
            {lista.map((ren) => (
              <li key={ren.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{ren.empresa?.nombre ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{ren.contrato?.numero_contrato} · {ren.contrato?.compania}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[ren.estado]}`}>
                        {ESTADO_LABEL[ren.estado]}
                      </span>
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${PRIORIDAD_BADGE[ren.prioridad]}`}>
                        {PRIORIDAD_LABEL[ren.prioridad]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Vence: {formatDate(ren.fecha_vencimiento_contrato)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditing(ren)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(ren.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditing(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing === 'new' ? 'Nueva renovación' : 'Editar renovación'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <RenovacionForm
                defaultValues={editing === 'new' ? undefined : editing}
                onSubmit={onSubmit}
                onCancel={() => setEditing(null)}
                submitting={submitting}
              />
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Eliminar renovación"
        message={aBorrar ? `¿Seguro que quieres eliminar la renovación de "${aBorrar.empresa?.nombre ?? ''}"? (soft delete)` : ''}
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
