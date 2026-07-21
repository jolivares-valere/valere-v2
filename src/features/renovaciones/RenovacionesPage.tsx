import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, RefreshCw, Search } from 'lucide-react'
import {
  useRenovaciones,
  useRenovacionesKPI,
  useCreateRenovacion,
  useUpdateRenovacion,
  useDeleteRenovacion,
} from './api'
import type { RenovacionConRelaciones } from './api'
import RenovacionForm from './components/RenovacionForm'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ExportButton from '../../core/components/ExportButton'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import StatusBadge, { type StatusVariant } from '../../core/components/StatusBadge'
import SortableTh from '../../core/components/SortableTh'
import useListParams from '../../core/hooks/useListParams'
import { formatDate } from '../../core/utils/dates'
import type { RenovacionInsert, EstadoRenovacion, PrioridadRenovacion } from '../../core/types/entities'

type EditingState = RenovacionConRelaciones | 'new' | null

const SORT_FIELDS = ['empresa', 'contrato', 'vencimiento', 'estado', 'prioridad'] as const
type SortField = (typeof SORT_FIELDS)[number]

// PATRÓN DE CARGA COMPLETA — decisión (a) de la semana 2 + CONDICIÓN DE
// CADUCIDAD (auditor, 21-jul-2026): las renovaciones caben en una sola carga
// (~504 vivas hoy) y el badge Vigente/Histórico necesita el conjunto COMPLETO
// por CUPS, así que búsqueda, filtros-chip, orden y export de esta página
// operan client-side sobre el total (el export saca el conjunto FILTRADO, no
// la página visible). ESTE PATRÓN CADUCA cuando `renovaciones` supere
// ~2.000-3.000 filas vivas: entonces la opción (b) —vista SQL con el cálculo
// Vigente/Histórico base-20 y paginación server-side— deja de ser opcional.
// Entrada de seguimiento en docs/MEJORAS_UI_BACKLOG.md.
const LISTA_PAGE_SIZE = 1000

const PRIORIDAD_ORDEN: Record<PrioridadRenovacion, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
  ok: 4,
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// CUPS de la renovación (vía su contrato). Puede haber varios; tomamos el primero.
const cupsCode = (r: RenovacionConRelaciones): string | null =>
  r.contrato?.cups?.[0]?.codigo_cups ?? null

// Identidad de CUPS: los primeros 20 dígitos. Un CUPS de 20 y otro de 22 que
// coinciden en los 20 primeros son el MISMO punto de suministro (no duplicar).
const cupsNorm = (r: RenovacionConRelaciones): string | null => {
  const c = cupsCode(r)
  return c ? c.slice(0, 20) : null
}

const ESTADO_VARIANT: Record<EstadoRenovacion, StatusVariant> = {
  detectada: 'info',
  contactado: 'accent',
  oferta_enviada: 'warning',
  negociacion: 'alert',
  renovado: 'success',
  perdido: 'danger',
}

const ESTADO_LABEL: Record<EstadoRenovacion, string> = {
  detectada: 'Detectada',
  contactado: 'Contactado',
  oferta_enviada: 'Oferta enviada',
  negociacion: 'Negociación',
  renovado: 'Renovado',
  perdido: 'Perdido',
}

const PRIORIDAD_VARIANT: Record<PrioridadRenovacion, StatusVariant> = {
  critica: 'danger',
  alta: 'alert',
  media: 'info',
  baja: 'neutral',
  ok: 'success',
}

const PRIORIDAD_LABEL: Record<PrioridadRenovacion, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ok: 'OK',
}

/** Etiqueta legible de un mes 'YYYY-MM' → 'jul 2026'. */
const mesLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
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

export default function RenovacionesPage() {
  const { search, sortField, sortDir, getFilter, updateParam, updateParams, setSearch, toggleSort, clearAll } =
    useListParams<SortField>({
      sortFields: SORT_FIELDS,
      defaultSort: 'vencimiento',
      defaultDir: 'desc',
      descFirstFields: ['vencimiento'],
    })

  // 'activas' es un valor VIRTUAL (estado ∉ {renovado, perdido}): replica la
  // semántica exacta de v_renovaciones_kpi para que las tarjetas KPI clicables
  // cuadren con la lista (PR-2.4).
  const filtroEstado = getFilter('estado') as EstadoRenovacion | 'activas' | ''
  const filtroPrioridad = getFilter('prioridad') as PrioridadRenovacion | ''
  const filtroCia = getFilter('cia')
  const filtroMes = getFilter('mes') // 'YYYY-MM' sobre fecha de vencimiento

  // Carga completa SIN filtros server-side: los chips filtran en memoria y el
  // badge Vigente/Histórico se calcula siempre sobre el conjunto total.
  const { data, isLoading } = useRenovaciones({ pageSize: LISTA_PAGE_SIZE })
  const kpi = useRenovacionesKPI()
  const createMut = useCreateRenovacion()
  const updateMut = useUpdateRenovacion()
  const deleteMut = useDeleteRenovacion()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // Texto visible del buscador (controlado): la URL (q) se actualiza con
  // debounce vía setSearch; este estado local permite que "Limpiar" vacíe
  // también el cuadro, no solo el param.
  const [busqueda, setBusqueda] = useState(search)

  const onLimpiar = () => {
    setBusqueda('')
    clearAll()
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
  const listaCompleta = data?.data ?? []

  // Opciones de chips derivadas de los datos reales (nada inventado).
  const companias = useMemo(() => {
    const set = new Set<string>()
    for (const r of listaCompleta) if (r.contrato?.compania) set.add(r.contrato.compania)
    return [...set].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  }, [listaCompleta])

  const meses = useMemo(() => {
    const set = new Set<string>()
    for (const r of listaCompleta) {
      const f = r.fecha_vencimiento_contrato
      if (f) set.add(f.slice(0, 7))
    }
    return [...set].sort()
  }, [listaCompleta])

  const lista = useMemo(() => {
    let rows = listaCompleta
    if (filtroEstado === 'activas') rows = rows.filter((r) => r.estado !== 'renovado' && r.estado !== 'perdido')
    else if (filtroEstado) rows = rows.filter((r) => r.estado === filtroEstado)
    if (filtroPrioridad) rows = rows.filter((r) => r.prioridad === filtroPrioridad)
    if (filtroCia) rows = rows.filter((r) => r.contrato?.compania === filtroCia)
    if (filtroMes) rows = rows.filter((r) => (r.fecha_vencimiento_contrato ?? '').slice(0, 7) === filtroMes)
    const q = normalizar(search.trim())
    if (q) {
      rows = rows.filter((r) =>
        normalizar(
          `${r.empresa?.nombre ?? ''} ${r.contrato?.compania ?? ''} ${r.contrato?.numero_contrato ?? ''} ${cupsCode(r) ?? ''}`,
        ).includes(q),
      )
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sortField) {
        case 'empresa':
          return dir * (a.empresa?.nombre ?? '').localeCompare(b.empresa?.nombre ?? '', 'es', { sensitivity: 'base' })
        case 'contrato':
          return dir * (a.contrato?.compania ?? '').localeCompare(b.contrato?.compania ?? '', 'es', { sensitivity: 'base' })
        case 'vencimiento': {
          const fa = a.fecha_vencimiento_contrato
          const fb = b.fecha_vencimiento_contrato
          if (!fa && !fb) return 0
          if (!fa) return 1 // sin fecha siempre al final
          if (!fb) return -1
          return dir * fa.localeCompare(fb)
        }
        case 'estado':
          return dir * ESTADO_LABEL[a.estado].localeCompare(ESTADO_LABEL[b.estado], 'es', { sensitivity: 'base' })
        case 'prioridad':
          return dir * (PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad])
        default:
          return 0
      }
    })
  }, [listaCompleta, filtroEstado, filtroPrioridad, filtroCia, filtroMes, search, sortField, sortDir])

  // Estado de rotación por CUPS, calculado SIEMPRE sobre el conjunto completo
  // cargado (nunca sobre el filtrado): por cada CUPS con varias renovaciones,
  // la del contrato con fecha_inicio más reciente = 'vigente'; el resto =
  // 'historico' (rotación pasada, visible sin tocar datos).
  const cupsStatus = useMemo(() => {
    const grupos = new Map<string, RenovacionConRelaciones[]>()
    for (const r of listaCompleta) {
      const code = cupsNorm(r)
      if (!code) continue
      const arr = grupos.get(code) ?? []
      arr.push(r)
      grupos.set(code, arr)
    }
    const status = new Map<string, 'vigente' | 'historico'>()
    for (const arr of grupos.values()) {
      if (arr.length < 2) continue // CUPS con una sola renovación → sin badge
      let masReciente = arr[0]
      for (const r of arr) {
        if ((r.contrato?.fecha_inicio ?? '') > (masReciente.contrato?.fecha_inicio ?? '')) {
          masReciente = r
        }
      }
      for (const r of arr) status.set(r.id, r.id === masReciente.id ? 'vigente' : 'historico')
    }
    return status
  }, [listaCompleta])

  const aBorrar = lista.find((r) => r.id === confirmDeleteId)
  const k = kpi.data
  const total = data?.count ?? 0
  const cargadas = listaCompleta.length
  const hayFiltros = Boolean(filtroEstado || filtroPrioridad || filtroCia || filtroMes || search.trim())

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Renovaciones</h1>
          <p className="text-sm text-slate-500">
            {hayFiltros
              ? `${lista.length} de ${cargadas} cargadas`
              : cargadas < total
                ? `${cargadas} de ${total} — aumenta el límite para verlas todas`
                : `${total} renovaciones`}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton<RenovacionConRelaciones>
            filename="renovaciones"
            // Exporta el conjunto FILTRADO completo (lo que hay en pantalla,
            // todas las filas — no una página), en el orden visible.
            fetchRows={() => Promise.resolve(lista)}
            columns={[
              { header: 'Empresa', value: (r) => r.empresa?.nombre },
              { header: 'Nº contrato', value: (r) => r.contrato?.numero_contrato },
              { header: 'Compañía', value: (r) => r.contrato?.compania },
              { header: 'CUPS', value: (r) => cupsCode(r) },
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
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nueva renovación
          </button>
        </div>
      </div>

      {k && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Activas"
            value={k.activas}
            color="text-blue-700"
            active={filtroEstado === 'activas' && !filtroPrioridad}
            onClick={() => updateParams(filtroEstado === 'activas' && !filtroPrioridad ? { estado: '', prioridad: '' } : { estado: 'activas', prioridad: '' })}
          />
          <KpiCard
            label="Críticas"
            value={k.criticas}
            color="text-red-700"
            active={filtroEstado === 'activas' && filtroPrioridad === 'critica'}
            onClick={() => updateParams(filtroEstado === 'activas' && filtroPrioridad === 'critica' ? { estado: '', prioridad: '' } : { estado: 'activas', prioridad: 'critica' })}
          />
          <KpiCard
            label="Renovadas"
            value={k.renovadas}
            color="text-green-700"
            active={filtroEstado === 'renovado'}
            onClick={() => updateParams(filtroEstado === 'renovado' ? { estado: '', prioridad: '' } : { estado: 'renovado', prioridad: '' })}
          />
          <KpiCard
            label="Perdidas"
            value={k.perdidas}
            color="text-rose-700"
            active={filtroEstado === 'perdido'}
            onClick={() => updateParams(filtroEstado === 'perdido' ? { estado: '', prioridad: '' } : { estado: 'perdido', prioridad: '' })}
          />
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setSearch(e.target.value) }}
            placeholder="Buscar empresa, compañía o nº contrato…"
            className="w-72 rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs"
            aria-label="Buscar renovaciones"
          />
        </div>
        <select
          value={filtroMes}
          onChange={(e) => updateParam('mes', e.target.value)}
          aria-label="Filtrar por mes de vencimiento"
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{mesLabel(m)}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => updateParam('estado', e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs"
        >
          <option value="">Todos los estados</option>
          <option value="activas">Activas (en curso)</option>
          {(Object.keys(ESTADO_LABEL) as EstadoRenovacion[]).map((e) => (
            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
          ))}
        </select>
        {hayFiltros && (
          <button
            type="button"
            onClick={onLimpiar}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-1.5" aria-label="Filtrar por prioridad">
        <span className="mr-1 text-xs text-slate-400">Prioridad:</span>
        {(Object.keys(PRIORIDAD_LABEL) as PrioridadRenovacion[]).map((p) => (
          <Chip key={p} active={filtroPrioridad === p} onClick={() => updateParam('prioridad', filtroPrioridad === p ? '' : p)}>
            {PRIORIDAD_LABEL[p]}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-label="Filtrar por comercializadora">
        <span className="mr-1 text-xs text-slate-400">Comercializadora:</span>
        {companias.map((c) => (
          <Chip key={c} active={filtroCia === c} onClick={() => updateParam('cia', filtroCia === c ? '' : c)}>
            {c}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">CUPS</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
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
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <RefreshCw className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="mb-3 text-sm text-slate-500">
            {hayFiltros ? 'Sin resultados para estos filtros' : 'Sin renovaciones registradas'}
          </p>
          {!hayFiltros && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" /> Crear la primera
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortableTh field="empresa" label="Empresa" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortableTh field="contrato" label="Contrato" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3">CUPS</th>
                  <SortableTh field="vencimiento" label="Vencimiento" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortableTh field="estado" label="Estado" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortableTh field="prioridad" label="Prioridad" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((ren) => (
                  <tr key={ren.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {ren.empresa ? (
                        <Link to={`/empresas/${ren.empresa.id}`} className="hover:underline">
                          {ren.empresa.nombre}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {ren.contrato?.numero_contrato ?? '—'}
                      {ren.contrato?.compania && (
                        <div className="text-slate-400">{ren.contrato.compania}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {cupsCode(ren) ? (
                        <div className="flex items-center gap-1.5">
                          <span title={cupsCode(ren) ?? ''} className="font-mono text-slate-600">{cupsNorm(ren)}</span>
                          {cupsStatus.get(ren.id) === 'vigente' && (
                            <StatusBadge variant="success" size="sm">Vigente</StatusBadge>
                          )}
                          {cupsStatus.get(ren.id) === 'historico' && (
                            <StatusBadge variant="neutral" size="sm">Histórico</StatusBadge>
                          )}
                          {(ren.contrato?.cups?.length ?? 0) > 1 && (
                            <span title="Este contrato tiene varios CUPS" className="text-amber-600">
                              +{(ren.contrato?.cups?.length ?? 1) - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(ren.fecha_vencimiento_contrato)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={ESTADO_VARIANT[ren.estado]}>
                        {ESTADO_LABEL[ren.estado]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={PRIORIDAD_VARIANT[ren.prioridad]}>
                        {PRIORIDAD_LABEL[ren.prioridad]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(ren)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Editar renovación de ${ren.empresa?.nombre ?? 'empresa'}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(ren.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Eliminar renovación de ${ren.empresa?.nombre ?? 'empresa'}`}>
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
              <li key={ren.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {ren.empresa ? (
                      <Link to={`/empresas/${ren.empresa.id}`} className="font-medium text-slate-900 hover:underline">
                        {ren.empresa.nombre}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-900">—</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">{ren.contrato?.numero_contrato} · {ren.contrato?.compania}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusBadge variant={ESTADO_VARIANT[ren.estado]} size="sm">
                        {ESTADO_LABEL[ren.estado]}
                      </StatusBadge>
                      <StatusBadge variant={PRIORIDAD_VARIANT[ren.prioridad]} size="sm">
                        {PRIORIDAD_LABEL[ren.prioridad]}
                      </StatusBadge>
                    </div>
                    {cupsCode(ren) && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-mono" title={cupsCode(ren) ?? ''}>{cupsNorm(ren)}</span>
                        {cupsStatus.get(ren.id) === 'vigente' && <StatusBadge variant="success" size="sm">Vigente</StatusBadge>}
                        {cupsStatus.get(ren.id) === 'historico' && <StatusBadge variant="neutral" size="sm">Histórico</StatusBadge>}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">Vence: {formatDate(ren.fecha_vencimiento_contrato)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditing(ren)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Editar renovación de ${ren.empresa?.nombre ?? 'empresa'}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(ren.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Eliminar renovación de ${ren.empresa?.nombre ?? 'empresa'}`}>
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

function KpiCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? 'Quitar este filtro' : `Filtrar la lista: ${label.toLowerCase()}`}
      className={`rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-md ${
        active ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200'
      }`}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </button>
  )
}
