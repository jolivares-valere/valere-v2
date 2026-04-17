import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useContratos, useCreateContrato, useUpdateContrato, useDeleteContrato } from './api'
import ContratoForm from './components/ContratoForm'
import PrioridadBadge from './components/PrioridadBadge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import { calcDiasVencimiento, calcPrioridad, formatComision } from '../../core/utils/energy'
import { formatDate } from '../../core/utils/dates'
import type { ContratoConRelaciones } from './api'
import type { ContratoInsert } from '../../core/types/entities'

type EditingState = ContratoConRelaciones | 'new' | null

export default function ContratosPage() {
  const { data, isLoading } = useContratos()
  const createMut = useCreateContrato()
  const updateMut = useUpdateContrato()
  const deleteMut = useDeleteContrato()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const onSubmit = async (values: ContratoInsert) => {
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
  const lista = data ?? []
  const aBorrar = lista.find((c) => c.id === confirmDeleteId)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500">{lista.length} contratos vigentes</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nuevo contrato
        </button>
      </div>

      {isLoading ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">CUPS</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Fin</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3"></th>
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
          <p className="mb-3 text-sm text-slate-500">Sin contratos registrados</p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir el primero
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">CUPS</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Fin</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((c) => {
                  const dias = calcDiasVencimiento(c.fecha_fin)
                  const prioridad = calcPrioridad(dias)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {c.empresa_id ? (
                          <Link to={`/empresas/${c.empresa_id}`} className="font-medium text-slate-900 hover:underline">
                            {c.empresa?.nombre ?? '—'}
                          </Link>
                        ) : '—'}
                        {c.comision_eur != null && (
                          <div className="text-xs text-slate-500">{formatComision(c.comision_eur)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.cups ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{c.tipo_punto?.replace('_', ' ') ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(c.fecha_fin) ?? '—'}</td>
                      <td className="px-4 py-3">
                        <PrioridadBadge prioridad={prioridad} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link to={`/contratos/${c.id}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Ver">
                            Ver
                          </Link>
                          <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-3">
            {lista.map((c) => {
              const dias = calcDiasVencimiento(c.fecha_fin)
              const prioridad = calcPrioridad(dias)
              return (
                <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/contratos/${c.id}`} className="font-medium text-slate-900 hover:underline">
                        {c.empresa?.nombre ?? c.cups ?? '—'}
                      </Link>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">{c.cups ?? ''}</p>
                      <p className="mt-1 text-xs text-slate-500 capitalize">
                        {c.tipo_punto?.replace('_', ' ') ?? '—'} · fin {formatDate(c.fecha_fin) ?? '—'}
                      </p>
                      <div className="mt-2"><PrioridadBadge prioridad={prioridad} /></div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditing(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing === 'new' ? 'Nuevo contrato' : 'Editar contrato'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ContratoForm
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
        title="Eliminar contrato"
        message={aBorrar ? `¿Seguro que quieres eliminar el contrato de "${aBorrar.empresa?.nombre ?? aBorrar.cups ?? ''}"? (soft delete)` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={onDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
