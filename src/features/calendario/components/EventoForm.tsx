import { useState, useEffect } from 'react'
import type { Evento, EventoInsert, TipoEvento } from '../../../core/types/entities'
import { useCreateEvento, useUpdateEvento, useDeleteEvento } from '../api'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'

const TIPOS: { value: TipoEvento; label: string }[] = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'visita', label: 'Visita' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'otro', label: 'Otro' },
]

interface Props {
  evento?: Evento | null
  defaultDate?: string
  defaultEntidadTipo?: string | null
  defaultEntidadId?: string | null
  onClose: () => void
}

export default function EventoForm({ evento, defaultDate, defaultEntidadTipo, defaultEntidadId, onClose }: Props) {
  const create = useCreateEvento()
  const update = useUpdateEvento()
  const remove = useDeleteEvento()

  const [titulo, setTitulo] = useState(evento?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? '')
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? 'reunion')
  const [fechaInicio, setFechaInicio] = useState(
    evento?.fecha_inicio?.slice(0, 16) ?? `${defaultDate ?? new Date().toISOString().slice(0, 10)}T09:00`,
  )
  const [fechaFin, setFechaFin] = useState(evento?.fecha_fin?.slice(0, 16) ?? '')
  const [todoElDia, setTodoElDia] = useState(evento?.todo_el_dia ?? false)
  const [ubicacion, setUbicacion] = useState(evento?.ubicacion ?? '')
  const [askDelete, setAskDelete] = useState(false)

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo)
      setDescripcion(evento.descripcion ?? '')
      setTipo(evento.tipo)
      setFechaInicio(evento.fecha_inicio.slice(0, 16))
      setFechaFin(evento.fecha_fin?.slice(0, 16) ?? '')
      setTodoElDia(evento.todo_el_dia)
      setUbicacion(evento.ubicacion ?? '')
    }
  }, [evento])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    const payload: EventoInsert = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      tipo,
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
      todo_el_dia: todoElDia,
      ubicacion: ubicacion.trim() || null,
      color: null,
      entidad_tipo: (defaultEntidadTipo ?? evento?.entidad_tipo ?? null) as EventoInsert['entidad_tipo'],
      entidad_id: defaultEntidadId ?? evento?.entidad_id ?? null,
      asignado_a: evento?.asignado_a ?? null,
      created_by: evento?.created_by ?? null,
    }
    if (evento) {
      await update.mutateAsync({ id: evento.id, patch: payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const confirmDelete = async () => {
    if (!evento) return
    await remove.mutateAsync(evento.id)
    setAskDelete(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEvento)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} />
            Todo el día
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Inicio *</label>
          <input
            type="datetime-local"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fin</label>
          <input
            type="datetime-local"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
        <input
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-between gap-2 pt-2">
        {evento ? (
          <button
            type="button"
            onClick={() => setAskDelete(true)}
            className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            Eliminar
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {evento ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={askDelete}
        title="Eliminar evento"
        message={evento ? `¿Eliminar el evento "${evento.titulo}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setAskDelete(false)}
      />
    </form>
  )
}
