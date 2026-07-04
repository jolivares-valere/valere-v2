import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, Flame, ChevronRight } from 'lucide-react'
import {
  useContratos,
  useCreateContrato,
  useUpdateContrato,
  useDeleteContrato,
  fetchContratosForExport,
  useContratosPorVencer,
  useResumenVencimientos,
} from './api'
import { useCrearTareaDesdeContrato } from '../../core/hooks/useAutomatizaciones'
import ContratoForm from './components/ContratoForm'
import PrioridadBadge from './components/PrioridadBadge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ExportButton from '../../core/components/ExportButton'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import { calcDiasVencimiento, calcPrioridad, formatComision } from '../../core/utils/energy'
import { formatDate } from '../../core/utils/dates'
import type { ContratoConEmpresa, ContratoPorVencer } from './api'
import type { ContratoInsert } from '../../core/types/entities'

type EditingState = ContratoConEmpresa | 'new' | null

export default function ContratosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const vencimientoMode = searchParams.get('vencimiento') === '1'
  // H1 (auditoría enlaces F2): el Dashboard enlaza con ?estado=activo|incidencia.
  // Antes este parámetro se descartaba en silencio; ahora filtra de verdad.
  const estadoFilter = searchParams.get('estado')

  const { data, isLoading } = useContratos()
  const porVencer = useContratosPorVencer(100)
  const resumen = useResumenVencimientos()
  const createMut = useCreateContrato()
  const updateMut = useUpdateContrato()
  const deleteMut = useDeleteContrato()
  const crearTarea = useCrearTareaDesdeContrato()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const clearEstado = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('estado')
    setSearchParams(next)
  }

  const toggleVencimiento = () => {
    const next = new URLSearchParams(searchParams)
    if (vencimientoMode) next.delete('vencimiento')
    else next.set('vencimiento', '1')
    setSearchParams(next)
  }

  const onSubmit = async (values: ContratoInsert) => {
    if (editing && editing !== 'new') {
      const prevEstado = editing.estado
      await updateMut.mutateAsync({ id: editing.id, patch: values })
      if (prevEstado !== 'activo' && values.estado === 'activo') {
        crearTarea.mutate({
          id: editing.id,
          compania: values.compania,
          empresa_id: values.empresa_id,
          comercial_id: values.comercial_id ?? null,
          empresa: editing.empresa ?? null,
        })
      }
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
  const todos = data?.data ?? []
  const lista = estadoFilter ? todos.filter((c) => c.estado === estadoFilter) : todos
  const aBorrar = lista.find((c) => c.id === confirmDeleteId)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Contratos</h1>
          <p className="text-sm text-slate-500">{lista.length} contratos vigentes</p>
        </div>
        <div className="flex gap-2">
          <ExportButton<ContratoConEmpresa>
            filename="contratos"
            fetchRows={() => fetchContratosForExport()}
            columns={[
              { header: 'Empresa', value: (c) => c.empresa?.nombre },
              { header: 'NIF', value: (c) => c.empresa?.nif },
              { header: 'CUPS', value: (c) => c.cups },
              { header: 'Tipo punto', value: (c) => c.tipo_punto },
              { header: 'Compañía', value: (c) => c.compania },
              { header: 'Tarifa acceso', value: (c) => c.tarifa_acceso },
              { header: 'Tarifa cliente', value: (c) => c.tarifa_cliente },
              { header: 'Estado', value: (c) => c.estado },
              { header: 'Fecha inicio', value: (c) => formatDate(c.fecha_inicio) },
              { header: 'Fecha fin', value: (c) => formatDate(c.fecha_fin) },
              { header: 'Número contrato', value: (c) => c.numero_contrato },
              { header: 'Comisión (€)', value: (c) => c.comision_eur },
              { header: 'Comercial', value: (c) => c.comercial?.full_name },
              { header: 'Firmante', value: (c) => c.contacto_firmante ? `${c.contacto_firmante.nombre} ${c.contacto_firmante.apellidos ?? ''}`.trim() : '' },
            ]}
          />
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nuevo contrato
          </button>
        </div>
      </div>

      {/* Filtro: Solo próximos a vencer */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVencimiento}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            vencimientoMode
              ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          Próximos a vencer
          {vencimientoMode && <X className="ml-1 h-3 w-3" />}
        </button>
        {estadoFilter && (
          <button
            type="button"
            onClick={clearEstado}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 ring-1 ring-blue-300 transition hover:bg-blue-200"
            title="Quitar filtro de estado"
          >
            Estado: {estadoFilter}
            <X className="ml-1 h-3 w-3" />
          </button>
        )}
      </div>

      {vencimientoMode && resumen.data && resumen.data.total > 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
              <span className="font-semibold text-red-700">{resumen.data.criticas}</span>
              <span className="text-slate-600">críticas (≤15 días)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="font-semibold text-orange-700">{resumen.data.proximas}</span>
              <span className="text-slate-600">próximas (≤30 días)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="font-semibold text-amber-700">{resumen.data.futuras}</span>
              <span className="text-slate-600">futuras (≤90 días)</span>
            </span>
          </div>
        </div>
      )}

      {vencimientoMode ? (
        <VencimientoList loading={porVencer.isLoading} rows={porVencer.data ?? []} />
      ) : isLoading ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
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
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="mb-3 text-sm text-slate-500">Sin contratos registrados</p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir el primero
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                          <Link to={`/contratos/${c.id}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Ver contrato ${c.numero_contrato ?? c.compania} de ${c.empresa?.nombre ?? 'empresa'}`}>
                            Ver
                          </Link>
                          <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Editar contrato ${c.numero_contrato ?? c.compania} de ${c.empresa?.nombre ?? 'empresa'}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Eliminar contrato ${c.numero_contrato ?? c.compania} de ${c.empresa?.nombre ?? 'empresa'}`}>
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
                <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                      <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Editar contrato ${c.numero_contrato ?? c.compania} de ${c.empresa?.nombre ?? 'empresa'}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Eliminar contrato ${c.numero_contrato ?? c.compania} de ${c.empresa?.nombre ?? 'empresa'}`}>
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

function VencimientoList({ loading, rows }: { loading: boolean; rows: ContratoPorVencer[] }) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
          </tbody>
        </table>
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-500">No hay contratos próximos a vencer.</p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Nº contrato</th>
            <th className="px-4 py-3">Fin</th>
            <th className="px-4 py-3">Días restantes</th>
            <th className="px-4 py-3">Alerta</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link to={`/empresas/${r.empresa_id}`} className="font-medium text-slate-900 hover:underline">
                  {r.empresa_nombre}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.numero_contrato ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(r.fecha_fin)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{r.dias_restantes}d</td>
              <td className="px-4 py-3"><AlertaBadge estado={r.estado_alerta} /></td>
              <td className="px-4 py-3 text-right">
                <Link to={`/contratos/${r.id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900">
                  Ver <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertaBadge({ estado }: { estado: ContratoPorVencer['estado_alerta'] }) {
  const cfg = {
    critica: { bg: 'bg-red-600 text-white', label: 'Crítica' },
    proxima: { bg: 'bg-orange-500 text-white', label: 'Próxima' },
    futura: { bg: 'bg-amber-400 text-slate-900', label: 'Futura' },
  }[estado]
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cfg.bg}`}>{cfg.label}</span>
}
