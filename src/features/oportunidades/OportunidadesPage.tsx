import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useOportunidades, useUpdateEtapa, useCreateOportunidad, useUpdateOportunidad, fetchOportunidadesForExport } from './api'
import type { OportunidadConEmpresa } from './api'
import { useTareasPendientesPorOportunidad } from '../actividades/api'
import KanbanColumn from './components/KanbanColumn'
import OportunidadForm from './components/OportunidadForm'
import ExportButton from '../../core/components/ExportButton'
import { formatDate } from '../../core/utils/dates'
import { useCrearContratoDesdeOportunidad } from '../../core/hooks/useAutomatizaciones'
import type { EtapaOportunidad, OportunidadInsert } from '../../core/types/entities'

// FASE 21.a — Pipeline con etapas energéticas reales + probabilidades.
const ETAPAS: { etapa: EtapaOportunidad; titulo: string; probabilidad: number }[] = [
  { etapa: 'prospecto', titulo: 'Prospecto', probabilidad: 10 },
  { etapa: 'auditoria_consumo', titulo: 'Auditoría consumo', probabilidad: 25 },
  { etapa: 'oferta_presentada', titulo: 'Oferta presentada', probabilidad: 50 },
  { etapa: 'negociacion', titulo: 'Negociación', probabilidad: 70 },
  { etapa: 'contrato_firmado', titulo: 'Contrato firmado', probabilidad: 90 },
  { etapa: 'activo', titulo: 'Activo', probabilidad: 100 },
  { etapa: 'cerrada_ganada', titulo: 'Ganada', probabilidad: 100 },
  { etapa: 'cerrada_perdida', titulo: 'Perdida', probabilidad: 0 },
]

// Mapeo de etapas legacy → canónica energética (no muta BD: solo visualización).
const LEGACY_MAP: Record<string, EtapaOportunidad> = {
  contactado: 'auditoria_consumo',
  analisis: 'auditoria_consumo',
  propuesta_enviada: 'oferta_presentada',
  ganada: 'cerrada_ganada',
  perdida: 'cerrada_perdida',
  cancelada: 'cerrada_perdida',
}

const canonicalEtapa = (e: EtapaOportunidad): EtapaOportunidad =>
  (LEGACY_MAP[e] as EtapaOportunidad) ?? e

type EditingState = OportunidadConEmpresa | 'new' | null

export default function OportunidadesPage() {
  const { data, isLoading } = useOportunidades()
  const tareasPendientes = useTareasPendientesPorOportunidad()
  const updateEtapa = useUpdateEtapa()
  const createMut = useCreateOportunidad()
  const updateMut = useUpdateOportunidad()
  const crearContrato = useCrearContratoDesdeOportunidad()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [editing, setEditing] = useState<EditingState>(null)

  const dispararAutoContrato = (op: OportunidadConEmpresa) => {
    crearContrato.mutate({
      id: op.id,
      nombre: op.nombre,
      empresa_id: op.empresa_id,
      comercial_id: op.comercial_id ?? null,
      empresa: op.empresa ?? null,
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const id = String(active.id)
    const etapa = over.id as EtapaOportunidad
    const columna = ETAPAS.find((c) => c.etapa === etapa)
    if (!columna) return
    const current = data?.find((o) => o.id === id)
    if (!current || canonicalEtapa(current.etapa) === etapa) return
    updateEtapa.mutate(
      { id, etapa, probabilidad: columna.probabilidad },
      {
        onSuccess: () => {
          if (etapa === 'cerrada_ganada') dispararAutoContrato(current)
        },
      },
    )
  }

  const onSubmit = async (values: OportunidadInsert) => {
    if (editing && editing !== 'new') {
      const prevCanonical = canonicalEtapa(editing.etapa)
      const newCanonical = canonicalEtapa(values.etapa)
      await updateMut.mutateAsync({ id: editing.id, patch: values as Partial<OportunidadInsert> })
      if (prevCanonical !== 'cerrada_ganada' && newCanonical === 'cerrada_ganada') {
        dispararAutoContrato({ ...editing, ...values })
      }
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
        <div className="flex gap-2">
          <ExportButton<OportunidadConEmpresa>
            filename="oportunidades"
            fetchRows={() => fetchOportunidadesForExport()}
            columns={[
              { header: 'Nombre', value: (o) => o.nombre },
              { header: 'Empresa', value: (o) => o.empresa?.nombre },
              { header: 'Contacto', value: (o) => o.contacto ? `${o.contacto.nombre} ${o.contacto.apellidos ?? ''}`.trim() : '' },
              { header: 'Tipo', value: (o) => o.tipo },
              { header: 'Etapa', value: (o) => o.etapa },
              { header: 'Probabilidad (%)', value: (o) => o.probabilidad_pct },
              { header: 'Valor estimado (€)', value: (o) => o.valor_estimado_eur },
              { header: 'Ahorro anual estimado (€)', value: (o) => o.ahorro_anual_estimado },
              { header: 'Cierre previsto', value: (o) => formatDate(o.fecha_cierre_prevista) },
              { header: 'Motivo pérdida', value: (o) => o.motivo_perdida },
              { header: 'Tags', value: (o) => (o.tags ?? []).join(', ') },
              { header: 'Creada', value: (o) => formatDate(o.created_at) },
            ]}
          />
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nueva oportunidad
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS.map(({ etapa, titulo, probabilidad }) => (
            <KanbanColumn
              key={etapa}
              etapa={etapa}
              titulo={titulo}
              probabilidad={probabilidad}
              items={(data ?? []).filter((o) => canonicalEtapa(o.etapa) === etapa)}
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