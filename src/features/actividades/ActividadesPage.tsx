import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Phone, Mail, Users, CheckSquare, StickyNote, FileText, MessageSquare, MapPin, Activity } from 'lucide-react'
import {
  useActividadesTodas,
  useCreateActividad,
  useUpdateActividad,
  useDeleteActividad,
  useToggleTareaCompletada,
  type ActividadConUsuario,
  type ActividadFilter,
} from './api'
import ActividadFormFull from './components/ActividadFormFull'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { formatDate } from '../../core/utils/dates'
import type { ActividadInsert, TipoActividad, EntidadTipo } from '../../core/types/entities'

const TIPOS: { value: TipoActividad; label: string }[] = [
  { value: 'nota', label: 'Notas' },
  { value: 'llamada', label: 'Llamadas' },
  { value: 'email', label: 'Emails' },
  { value: 'reunion', label: 'Reuniones' },
  { value: 'tarea', label: 'Tareas' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visita', label: 'Visitas' },
  { value: 'documento', label: 'Documentos' },
]

const ICONS: Record<TipoActividad, React.ComponentType<{ className?: string }>> = {
  llamada: Phone,
  email: Mail,
  reunion: Users,
  tarea: CheckSquare,
  nota: StickyNote,
  cambio_estado: Activity,
  documento: FileText,
  whatsapp: MessageSquare,
  visita: MapPin,
}

type PanelState = ActividadConUsuario | 'new' | null

export default function ActividadesPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? '1')
  const tipo = (params.get('tipo') as TipoActividad | null) ?? null
  const entidadTipoParam = (params.get('entidad_tipo') as EntidadTipo | null) ?? null
  const entidadIdParam = params.get('entidad_id') ?? ''
  const soloPendientes = params.get('pendientes') === '1'
  const desde = params.get('desde') ?? ''

  const [panel, setPanel] = useState<PanelState>(null)
  const [toDelete, setToDelete] = useState<ActividadConUsuario | null>(null)

  const filter: ActividadFilter = useMemo(() => {
    const f: ActividadFilter = {}
    if (tipo) f.tipo = tipo
    if (entidadTipoParam) f.entidad_tipo = entidadTipoParam
    if (entidadIdParam) f.entidad_id = entidadIdParam
    if (soloPendientes) f.solo_pendientes = true
    if (desde) f.desde = new Date(desde).toISOString()
    return f
  }, [tipo, entidadTipoParam, entidadIdParam, soloPendientes, desde])

  const { data, isLoading } = useActividadesTodas({ page, pageSize: 30, filter })
  const createMut = useCreateActividad()
  const updateMut = useUpdateActividad()
  const deleteMut = useDeleteActividad()
  const toggleMut = useToggleTareaCompletada()

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 30))

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const onSubmit = async (values: ActividadInsert) => {
    if (panel && panel !== 'new') {
      await updateMut.mutateAsync({ id: panel.id, patch: values })
    } else {
      await createMut.mutateAsync(values)
    }
    setPanel(null)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    await deleteMut.mutateAsync(toDelete.id)
    setToDelete(null)
  }

  const editing = panel !== null && panel !== 'new' ? panel : undefined
  const isSubmitting = createMut.isPending || updateMut.isPending
  const panelTitle = editing ? 'Editar actividad' : 'Nueva actividad'

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actividades</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} en total</p>
        </div>
        <button
          type="button"
          onClick={() => setPanel('new')}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nueva actividad
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateParam('tipo', '')}
          className={`rounded px-3 py-1 text-xs ${!tipo ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Todos
        </button>
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => updateParam('tipo', t.value)}
            className={`rounded px-3 py-1 text-xs ${tipo === t.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => updateParam('pendientes', soloPendientes ? '' : '1')}
          className={`ml-auto rounded px-3 py-1 text-xs ${soloPendientes ? 'bg-amber-500 text-white' : 'border border-slate-300 text-slate-700'}`}
        >
          Solo tareas pendientes
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Asociada</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} cols={8} />)}
            {!isLoading && (data?.data.length ?? 0) === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Sin resultados</td></tr>}
            {!isLoading && data?.data.map((a) => {
              const Icon = ICONS[a.tipo] ?? StickyNote
              const isTarea = a.tipo === 'tarea'
              const completada = a.estado_tarea === 'completada'
              return (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {isTarea ? (
                      <input
                        type="checkbox"
                        checked={completada}
                        disabled={toggleMut.isPending}
                        onChange={(e) => toggleMut.mutate({ id: a.id, completada: e.target.checked })}
                        aria-label="Marcar completada"
                      />
                    ) : (
                      <Icon className="h-4 w-4 text-slate-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setPanel(a)}
                      className={`text-left font-medium hover:underline ${completada ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                    >
                      {a.titulo}
                    </button>
                    {a.descripcion && <p className="text-xs text-slate-500">{a.descripcion.slice(0, 80)}{a.descripcion.length > 80 ? '…' : ''}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{a.tipo.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.entidad_tipo}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.fecha_actividad)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {isTarea && a.estado_tarea && (
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        a.estado_tarea === 'completada' ? 'bg-green-100 text-green-700' :
                        a.estado_tarea === 'cancelada' ? 'bg-slate-100 text-slate-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {a.estado_tarea}
                      </span>
                    )}
                    {a.resultado && (
                      <span className="ml-1 text-xs text-slate-500">{a.resultado}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.usuario?.nombre_completo ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setToDelete(a)}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <button type="button" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50">Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50">Siguiente</button>
        </div>
      )}

      {panel !== null && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPanel(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">{panelTitle}</h2>
              <button type="button" onClick={() => setPanel(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ActividadFormFull
                defaultValues={editing}
                onSubmit={onSubmit}
                onCancel={() => setPanel(null)}
                submitting={isSubmitting}
              />
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={toDelete !== null}
        title="Eliminar actividad"
        message={toDelete ? `¿Eliminar "${toDelete.titulo}"?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}