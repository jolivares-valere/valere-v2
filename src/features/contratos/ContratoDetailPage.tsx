import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useContratoById } from './api'
import EstadoBadge from './components/EstadoBadge'
import PrioridadBadge from './components/PrioridadBadge'
import ActividadTimeline from '../actividades/components/ActividadTimeline'
import { calcDiasVencimiento, calcPrioridad, formatComision } from '../../core/utils/energy'
import { formatDate } from '../../core/utils/dates'

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useContratoById(id)

  if (isLoading) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!data) return <div className="p-8 text-slate-500">Contrato no encontrado</div>

  const { contrato, cups } = data
  const dias = calcDiasVencimiento(contrato.fecha_fin)
  const prioridad = calcPrioridad(dias)

  return (
    <div className="p-8">
      <Link to="/contratos" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Contratos
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {contrato.empresa?.nombre ?? '—'}
          </h1>
          <p className="text-sm text-slate-500">
            {contrato.numero_contrato ?? 'Sin nº'} · {contrato.compania}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EstadoBadge estado={contrato.estado} />
          <PrioridadBadge prioridad={prioridad} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Datos del contrato</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row k="Tarifa acceso" v={contrato.tarifa_acceso ?? '—'} />
            <Row k="Tarifa cliente" v={contrato.tarifa_cliente ?? '—'} />
            <Row k="Tipo energía" v={contrato.tipo_energia ?? '—'} />
            <Row k="Tipo precio" v={contrato.tipo_precio ?? '—'} />
            <Row k="Fecha firma" v={formatDate(contrato.fecha_firma)} />
            <Row k="Inicio" v={formatDate(contrato.fecha_inicio)} />
            <Row k="Vencimiento" v={`${formatDate(contrato.fecha_fin)} (${dias}d)`} />
            <Row k="Duración" v={contrato.duracion_meses ? `${contrato.duracion_meses} meses` : '—'} />
            <Row k="Consumo SIPS" v={contrato.consumo_sips_kwh ? `${contrato.consumo_sips_kwh} kWh` : '—'} />
            <Row k="Potencia" v={contrato.potencia_contratada ? `${contrato.potencia_contratada} kW` : '—'} />
            <Row k="Comisión integra" v={formatComision(contrato.comision_integra)} />
            <Row k="Comisión comercial" v={formatComision(contrato.comision_comercial)} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Observaciones</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{contrato.observaciones}</p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ActividadTimeline entidadTipo="contrato" entidadId={contrato.id} />
      </div>
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
