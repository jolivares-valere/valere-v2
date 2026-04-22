import { useState } from 'react'
import { Phone, Mail, Users, CheckSquare, StickyNote, Activity, FileText, MessageSquare, MapPin } from 'lucide-react'
import { useAuth } from '../../../core/hooks/useAuth'
import { useRealtime } from '../../../core/hooks/useRealtime'
import { formatDate } from '../../../core/utils/dates'
import { useActividades, useCreateActividad, type ActividadConUsuario } from '../api'
import ActividadForm from './ActividadForm'
import type { EntidadTipo, TipoActividad } from '../../../core/types/entities'

const iconByTipo: Record<TipoActividad, React.ComponentType<{ className?: string }>> = {
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

interface Props {
  entidadTipo: EntidadTipo
  entidadId: string
  showForm?: boolean
}

export default function ActividadTimeline({ entidadTipo, entidadId, showForm = true }: Props) {
  const { data, refetch } = useActividades(entidadTipo, entidadId)
  const createMut = useCreateActividad()
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)

  useRealtime(
    'actividades',
    `entidad_id=eq.${entidadId}`,
    () => { void refetch() },
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Actividad</h3>
        {showForm && (
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            {formOpen ? 'Cancelar' : 'Nueva'}
          </button>
        )}
      </div>

      {formOpen && showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ActividadForm
            entidadTipo={entidadTipo}
            entidadId={entidadId}
            usuarioId={user?.id}
            submitting={createMut.isPending}
            onSubmit={async (input) => {
              await createMut.mutateAsync(input)
              setFormOpen(false)
            }}
          />
        </div>
      )}

      <ul className="space-y-3">
        {(data ?? []).length === 0 && (
          <li className="text-sm text-slate-500">Aún no hay actividades.</li>
        )}
        {data?.map((a) => <Item key={a.id} a={a} />)}
      </ul>
    </div>
  )
}

function Item({ a }: { a: ActividadConUsuario }) {
  const Icon = iconByTipo[a.tipo]
  return (
    <li className="flex gap-3 text-sm">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <p className="font-medium text-slate-900">{a.titulo}</p>
          <span className="text-xs text-slate-500">{formatDate(a.fecha_actividad, 'relative')}</span>
        </div>
        {a.descripcion && <p className="mt-0.5 text-slate-600">{a.descripcion}</p>}
        <p className="mt-0.5 text-xs text-slate-400">
          {a.usuario?.full_name ?? 'Sistema'} · {a.tipo.replace('_', ' ')}
          {a.estado_tarea && ` · ${a.estado_tarea}`}
        </p>
      </div>
    </li>
  )
}
