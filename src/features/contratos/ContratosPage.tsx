import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, Flame, ChevronRight } from 'lucide-react'
import {
  useContratos,
  useCreateContrato,
  useUpdateContrato,
  useDeleteContrato,
  fetchContratosForExport,
  useContratosPorVencer,
  useResumenVencimientos,
  useComercializadorasDeContratos,
} from './api'
import { useCrearTareaDesdeContrato } from '../../core/hooks/useAutomatizaciones'
import ContratoForm from './components/ContratoForm'
import PrioridadBadge from './components/PrioridadBadge'
import EstadoBadge from './components/EstadoBadge'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ExportButton from '../../core/components/ExportButton'
import Pagination from '../../core/components/Pagination'
import SortableTh from '../../core/components/SortableTh'
import { LoadingRow, ErrorRow, EmptyRow } from '../../core/components/TableStateRows'
import useListParams from '../../core/hooks/useListParams'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import { calcDiasVencimiento, calcPrioridad, formatComision } from '../../core/utils/energy'
import { formatDate } from '../../core/utils/dates'
import type { ContratoConEmpresa, ContratoPorVencer } from './api'
import type { ContratoInsert, EstadoContrato } from '../../core/types/entities'

type EditingState = ContratoConEmpresa | 'new' | null

// Campos ordenables server-side (columnas reales de `contratos`; la relación
// empresa no es ordenable desde aquí sin vista, y no hace falta para el CA).
const SORT_FIELDS = ['compania', 'cups', 'fecha_fin', 'estado'] as const
type SortField = (typeof SORT_FIELDS)[number]

const PAGE_SIZE = 20

const ESTADO_LABEL: Record<EstadoContrato, string> = {
  borrador: 'Borrador',
  tramite: 'Trámite',
  activo: 'Activo',
  vencido: 'Vencido',
  baja: 'Baja',
  incidencia: 'Incidencia',
  cancelado: 'Cancelado',
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function ContratosPage() {
  const { page, sortField, sortDir, getFilter, updateParam, toggleSort, clearAll } =
    useListParams<SortField>({
      sortFields: SORT_FIELDS,
      defaultSort: 'fecha_fin',
      defaultDir: 'desc',
      descFirstFields: ['fecha_fin'],
    })

  const vencimientoMode = getFilter('vencimiento') === '1'
  // H1 (auditoría enlaces F2): el Dashboard enlaza con ?estado=activo|incidencia.
  // El param se mantiene con el mismo nombre; ahora además es un chip.
  const estadoFilter = getFilter('estado') as EstadoContrato | ''
  const ciaFilter = getFilter('cia')

  const { data, isLoading, error, refetch, isFetching } = useContratos({
    page,
    pageSize: PAGE_SIZE,
    filter: {
      estado: estadoFilter || undefined,
      compania_eq: ciaFilter || undefined,
    },
    sort: { field: sortField, direction: sortDir },
  })
  const { data: companias } = useComercializadorasDeContratos()
  const porVencer = useContratosPorVencer(100)
  const resumen = useResumenVencimientos()
  const createMut = useCreateContrato()
  const updateMut = useUpdateContrato()
  const deleteMut = useDeleteContrato()
  const crearTarea = useCrearTareaDesdeContrato()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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
  const lista = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hayFiltros = Boolean(estadoFilter || ciaFilter)
  const aBorrar = lista.find((c) => c.id === confirmDeleteId)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Contratos</h1>
          <p className="text-sm text-slate-500">
            {hayFiltros ? `${total} contratos con estos filtros` : `${total} contratos en total`}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton<ContratoConEmpresa>
            filename="contratos"
            // Exporta el conjunto FILTRADO completo (server-side, hasta 10.000
            // filas), no la página visible.
            fetchRows={() => fetchContratosForExport({
              estado: estadoFilter || undefined,
              compania_eq: ciaFilter || undefined,
            })}
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

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => updateParam('vencimiento', vencimientoMode ? '' : '1')}
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
        {(hayFiltros || vencimientoMode) && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-1.5" aria-label="Filtrar por estado">
        <span className="mr-1 text-xs text-slate-400">Estado:</span>
        {(Object.keys(ESTADO_LABEL) as EstadoContrato[]).map((e) => (
          <Chip key={e} active={estadoFilter === e} onClick={() => updateParam('estado', estadoFilter === e ? '' : e)}>
            {ESTADO_LABEL[e]}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-label="Filtrar por comercializadora">
        <span className="mr-1 text-xs text-slate-400">Comercializadora:</span>
        {(companias ?? []).map((c) => (
          <Chip key={c} active={ciaFilter === c} onClick={() => updateParam('cia', ciaFilter === c ? '' : c)}>
            {c}
          </Chip>
        ))}
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
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <SortableTh field="compania" label="Compañía" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortableTh field="cups" label="CUPS" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortableTh field="fecha_fin" label="Fin" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortableTh field="estado" label="Estado" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && <LoadingRow colSpan={7} />}
                {error && (
                  <ErrorRow
                    colSpan={7}
                    message={`Error al cargar contratos: ${(error as Error).message}`}
                    onRetry={() => refetch()}
                    retrying={isFetching}
                  />
                )}
                {!isLoading && !error && lista.length === 0 && (
                  <EmptyRow colSpan={7} label={hayFiltros ? 'Sin resultados para estos filtros' : 'Sin contratos registrados'} />
                )}
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
                      <td className="px-4 py-3 text-xs text-slate-600">{c.compania ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.cups ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(c.fecha_fin) ?? '—'}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
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

          <div className="md:hidden">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
            <ul className="space-y-3">
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
                        <p className="mt-1 text-xs text-slate-500">
                          {c.compania ?? '—'} · fin {formatDate(c.fecha_fin) ?? '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <EstadoBadge estado={c.estado} />
                          <PrioridadBadge prioridad={prioridad} />
                        </div>
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
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => updateParam('page', String(p))} />
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
