import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useOportunidades, useUpdateEtapa } from './api'
import KanbanColumn from './components/KanbanColumn'
import type { EtapaOportunidad } from '../../core/types/entities'

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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  if (isLoading) return <div className="p-8 text-slate-500">Cargando pipeline…</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
        <p className="text-sm text-slate-500">{data?.length ?? 0} oportunidades en el pipeline</p>
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
    </div>
  )
}
