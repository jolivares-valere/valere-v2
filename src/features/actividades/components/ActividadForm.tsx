import { useState, type FormEvent } from 'react'
import type {
  ActividadInsert,
  EntidadTipo,
  TipoActividad,
} from '../../../core/types/entities'

interface Props {
  entidadTipo: EntidadTipo
  entidadId: string
  usuarioId: string | undefined
  submitting?: boolean
  onSubmit: (input: ActividadInsert) => Promise<void>
}

const TIPOS: TipoActividad[] = ['nota', 'llamada', 'email', 'reunion', 'tarea', 'whatsapp', 'visita', 'documento']

export default function ActividadForm({ entidadTipo, entidadId, usuarioId, submitting, onSubmit }: Props) {
  const [tipo, setTipo] = useState<TipoActividad>('nota')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  const handle = async (e: FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    await onSubmit({
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      fecha_actividad: new Date().toISOString(),
      duracion_min: null,
      resultado: null,
      estado_tarea: tipo === 'tarea' ? 'pendiente' : null,
      fecha_vencimiento: tipo === 'tarea' && fechaVencimiento
        ? new Date(fechaVencimiento).toISOString()
        : null,
      entidad_tipo: entidadTipo,
      entidad_id: entidadId,
      usuario_id: usuarioId ?? null,
      asignado_a: tipo === 'tarea' ? usuarioId ?? null : null,
      adjunto_url: null,
      adjunto_nombre: null,
      privada: false,
    })
    setTitulo('')
    setDescripcion('')
    setFechaVencimiento('')
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="flex gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoActividad)}
          className="rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <textarea
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />
      {tipo === 'tarea' && (
        <input
          type="date"
          value={fechaVencimiento}
          onChange={(e) => setFechaVencimiento(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
        />
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !titulo.trim()}
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {submitting ? 'Creando…' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
