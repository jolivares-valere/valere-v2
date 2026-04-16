import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useOportunidades, useUpdateEtapa, useCreateOportunidad } from './api'
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

export default function OportunidadesPage() {
  const { data, isLoading } = useOportunidades()
  const updateEtapa = useUpdateEtapa()
  const createMut = useCreateOportunidad()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [showForm, setShowForm] = useState(false)

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

  const onCreate = async (values: OportunidadInsert) => {
    await createMut.mutateAsync(values)
    setShowForm(false)
  }

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
          onClick={() => setShowForm(true)}
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
            />
          ))}
        </div>
      </DndContext>

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Nueva oportunidad</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <OportunidadForm
                onSubmit={onCreate}
                onCancel={() => setShowForm(false)}
                submitting={createMut.isPending}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
