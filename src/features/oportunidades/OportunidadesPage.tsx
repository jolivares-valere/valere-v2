import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useOportunidades, useUpdateEtapa, useCreateOportunidad, useUpdateOportunidad } from './api'
import type { OportunidadConEmpresa } from './api'
import { useTareasPendientesPorOportunidad } from '../actividades/api'
import KanbanColumn from './components/KanbanColumn'
import OportunidadForm from './components/OportunidadForm'
import type { EtapaOportunidad, OportunidadInsert } from '../../core/types/entities'

const ETAPAS: { etapa: EtapaOportunidad; titulo: string }[] = [
  { etapa: 'prospecto', titulo: 'Prospecto' },
  { etapa: 'contactado', titulo: 'Contactado' },
  { etapa: 'analisis', titulo: 'Análisis' },
  { etapa: 'propuesta_enviada', titulo: 'Propuesta' },
  { etapa: 'negociacion', titulo: 'Negociación' },
  { etapa: 'ganada', titulo: 'Ganada' },
  { etapa: 'perdida', titulo: 'Perdida' },
]

type EditingState = OportunidadConEmpresa | 'new' | null

export default function OportunidadesPage() {
  const { data, isLoading } = useOportunidades()
  const tareasPendientes = useTareasPendientesPorOportunidad()
  const updateEtapa = useUpdateEtapa()
  const createMut = useCreateOportunidad()
  const updateMut = useUpdateOportunidad()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [editing, setEditing] = useState<EditingState>(null)

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const id = String(active.id)
    const etapa = over.id as EtapaOportunidad
    if (!ETAPAS.some((e) => e.etapa === etapa)) return
    const current = data?.find((o) => o.id === id)
    if (!current || current.etapa === etapa) return
    updateEtapa.mutate({ id, etapa })
  }

  const onSubmit = async (values: OportunidadInsert) => {
    if (editing && editing !== 'new') {
      await updateMut.mutateAsync({ id: editing.id, patch: values as Partial<OportunidadInsert> })
    } else {
      await createMut.mutateAsync(values)
    }
    setEditing(null)
  }

  const submitting = createMut.isPending || updateMut.isPending

  if (isLoading) return <div className="p-8 text-slate-500">Cargando pipeline…</div>

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">{data?.length ?? 0} oportunidades en el pipeline</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nueva oportunidad
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS.map(({ etapa, titulo }) => (
            <KanbanColumn
              key={etapa}
              etapa={etapa}
              titulo={titulo}
              items={(data ?? []).filter((o) => o.etapa === etapa)}
              tareasPorOportunidad={tareasPendientes.data}
              onCardClick={(op) => setEditing(op)}
            />
          ))}
        </div>
      </DndContext>

      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditing(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing === 'new' ? 'Nueva oportunidad' : 'Editar oportunidad'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <OportunidadForm
                defaultValues={editing === 'new' ? undefined : editing}
                onSubmit={onSubmit}
                onCancel={() => setEditing(null)}
                submitting={submitting}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}