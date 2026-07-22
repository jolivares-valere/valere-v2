import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, X } from 'lucide-react'
import BackButton from '../../core/components/BackButton'
import EntidadNoEncontrada from '../../core/components/EntidadNoEncontrada'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ContratoForm from './components/ContratoForm'
import { useContratoById, useUpdateContrato, useDeleteContrato } from './api'
import type { ContratoInsert } from '../../core/types/entities'
import { useRenovacionViva } from '../renovaciones/api'
import EstadoBadge from './components/EstadoBadge'
import PrioridadBadge from './components/PrioridadBadge'
import ActividadTimeline from '../actividades/components/ActividadTimeline'
import DocumentosTab from '../documentos/components/DocumentosTab'
import { calcDiasVencimiento, calcPrioridad, formatComision } from '../../core/utils/energy'
import { formatDate } from '../../core/utils/dates'

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useContratoById(id)
  const renovacionViva = useRenovacionViva(id)
  const updateMut = useUpdateContrato()
  const deleteMut = useDeleteContrato()
  // F3 (Julia, gate V3): editar y eliminar TAMBIEN desde el detalle del contrato
  // (el camino natural desde la ficha de empresa no tenia acciones)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!data) return <EntidadNoEncontrada entidad="contrato" backTo="/contratos" backLabel="Volver a Contratos" />

  const { contrato, cups } = data
  const dias = calcDiasVencimiento(contrato.fecha_fin)
  // Fuente única de prioridad (PR-1.3): manda renovaciones.prioridad.
  // Solo si el contrato no tiene renovación viva se estima por días.
  const prioridad = renovacionViva.data?.prioridad ?? calcPrioridad(dias)
  const prioridadEstimada = !renovacionViva.isLoading && !renovacionViva.data

  return (
    <div className="p-8">
      <BackButton to="/contratos" label="Volver a Contratos" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">
            {contrato.empresa?.nombre ?? '—'}
          </h1>
          <p className="text-sm text-slate-500">
            {contrato.numero_contrato ?? 'Sin nº'} · {contrato.compania}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
          <EstadoBadge estado={contrato.estado} />
          <PrioridadBadge prioridad={prioridad} />
          {prioridadEstimada && (
            <span
              className="text-[10px] italic text-slate-400"
              title="Sin renovación registrada: prioridad estimada por días al vencimiento"
            >
              estimada
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Datos del contrato</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row k="Tarifa acceso" v={contrato.tarifa_acceso ?? '—'} />
            <Row k="Tarifa cliente" v={contrato.tarifa_cliente ?? '—'} />
            <Row k="Tipo energía" v={contrato.tipo_energia ?? '—'} />
            <Row k="Tipo precio" v={contrato.tipo_precio ?? '—'} />
            <Row k="Fecha firma" v={formatDate(contrato.fecha_firma)} />
            <Row k="Inicio" v={formatDate(contrato.fecha_inicio)} />
            <Row k="Vencimiento" v={contrato.fecha_fin ? `${formatDate(contrato.fecha_fin)} (${dias}d)` : '—'} />
            <Row k="Duración" v={contrato.duracion_meses ? `${contrato.duracion_meses} meses` : '—'} />
            <Row k="Consumo SIPS" v={contrato.consumo_sips_kwh ? `${contrato.consumo_sips_kwh} kWh` : '—'} />
            <Row k="Potencia" v={contrato.potencia_contratada ? `${contrato.potencia_contratada} kW` : '—'} />
            <Row k="Comisión integra" v={formatComision(contrato.comision_integra)} />
            <Row k="Comisión comercial" v={formatComision(contrato.comision_comercial)} />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">CUPS ({cups.length})</h3>
          {cups.length === 0 ? (
            <p className="text-sm text-slate-500">Este contrato no tiene CUPS registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">Código</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {cups.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-700">{c.codigo_cups}</td>
                    <td className="py-2 text-slate-600">{c.estado}</td>
                    <td className="py-2 text-slate-600">{c.direccion_suministro ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {contrato.observaciones && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Observaciones</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{contrato.observaciones}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ActividadTimeline entidadTipo="contrato" entidadId={contrato.id} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <DocumentosTab entidadTipo="contrato" entidadId={contrato.id} />
      </div>

      {editing && (
        <div role="dialog" aria-modal="true" aria-label="Editar contrato" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Editar contrato</h2>
              <button type="button" onClick={() => setEditing(false)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <ContratoForm
              defaultValues={contrato}
              submitting={updateMut.isPending}
              onCancel={() => setEditing(false)}
              onSubmit={async (values: ContratoInsert) => {
                await updateMut.mutateAsync({ id: contrato.id, patch: values })
                setEditing(false)
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Eliminar contrato"
        message={`¿Eliminar el contrato ${contrato.numero_contrato ?? 'sin nº'} de ${contrato.compania}? (soft delete)`}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={async () => {
          await deleteMut.mutateAsync(contrato.id)
          setConfirmDelete(false)
          navigate(-1)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="text-slate-900">{v}</dd>
    </div>
  )
}
