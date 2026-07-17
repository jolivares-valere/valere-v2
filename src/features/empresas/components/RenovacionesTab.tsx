import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRenovaciones, type RenovacionConRelaciones } from '../../renovaciones/api'
import StatusBadge, { type StatusVariant } from '../../../core/components/StatusBadge'
import { formatDate } from '../../../core/utils/dates'
import type { EstadoRenovacion, PrioridadRenovacion } from '../../../core/types/entities'

const PRIORIDAD_VARIANT: Record<PrioridadRenovacion, StatusVariant> = {
  critica: 'danger',
  alta: 'alert',
  media: 'info',
  baja: 'neutral',
  ok: 'success',
}

const PRIORIDAD_LABEL: Record<PrioridadRenovacion, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ok: 'OK',
}

const ESTADO_VARIANT: Record<EstadoRenovacion, StatusVariant> = {
  detectada: 'info',
  contactado: 'accent',
  oferta_enviada: 'warning',
  negociacion: 'warning',
  renovado: 'success',
  perdido: 'danger',
}

const ESTADO_LABEL: Record<EstadoRenovacion, string> = {
  detectada: 'Detectada',
  contactado: 'Contactado',
  oferta_enviada: 'Oferta enviada',
  negociacion: 'Negociación',
  renovado: 'Renovado',
  perdido: 'Perdido',
}

const cupsCode = (r: RenovacionConRelaciones): string | null =>
  r.contrato?.cups?.[0]?.codigo_cups ?? null

// Identidad de CUPS: primeros 20 caracteres (misma regla que RenovacionesPage).
const cupsNorm = (r: RenovacionConRelaciones): string | null => {
  const c = cupsCode(r)
  return c ? c.slice(0, 20) : null
}

/**
 * Pestaña Renovaciones de la ficha de empresa (PR-1.3, semana 1 CRM ÚTIL).
 * Lee `renovaciones.prioridad` como fuente única. Badge Vigente/Histórico
 * por rotación de CUPS (misma regla que /renovaciones). Solo lectura.
 */
export default function RenovacionesTab({ empresaId }: { empresaId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useRenovaciones({
    filter: { empresa_id: empresaId },
    pageSize: 200,
    sort: { field: 'fecha_vencimiento_contrato', direction: 'asc' },
  })
  const lista = data?.data ?? []

  const cupsStatus = useMemo(() => {
    const grupos = new Map<string, RenovacionConRelaciones[]>()
    for (const r of lista) {
      const code = cupsNorm(r)
      if (!code) continue
      const arr = grupos.get(code) ?? []
      arr.push(r)
      grupos.set(code, arr)
    }
    const status = new Map<string, 'vigente' | 'historico'>()
    for (const arr of grupos.values()) {
      if (arr.length < 2) continue
      let masReciente = arr[0]
      for (const r of arr) {
        if ((r.contrato?.fecha_inicio ?? '') > (masReciente.contrato?.fecha_inicio ?? '')) {
          masReciente = r
        }
      }
      for (const r of arr) status.set(r.id, r.id === masReciente.id ? 'vigente' : 'historico')
    }
    return status
  }, [lista])

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    )
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
        <p className="text-sm text-slate-500">Esta empresa no tiene renovaciones registradas</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {lista.length} renovaci{lista.length === 1 ? 'ón' : 'ones'} · clic en una fila para ver el contrato
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Prioridad</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">CUPS</th>
              <th className="px-3 py-2">Comercializadora</th>
              <th className="px-3 py-2">Vencimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((r) => (
              <tr
                key={r.id}
                onClick={() => r.contrato && navigate(`/contratos/${r.contrato.id}`)}
                className={r.contrato ? 'cursor-pointer hover:bg-slate-50' : ''}
                title={r.contrato ? 'Ver contrato' : undefined}
              >
                <td className="px-3 py-2.5">
                  <StatusBadge size="sm" variant={PRIORIDAD_VARIANT[r.prioridad] ?? 'neutral'}>
                    {PRIORIDAD_LABEL[r.prioridad] ?? r.prioridad}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge size="sm" variant={ESTADO_VARIANT[r.estado] ?? 'neutral'}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    {cupsCode(r) ?? '—'}
                    {cupsStatus.get(r.id) === 'vigente' && <StatusBadge variant="success" size="sm">Vigente</StatusBadge>}
                    {cupsStatus.get(r.id) === 'historico' && <StatusBadge variant="neutral" size="sm">Histórico</StatusBadge>}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-900">{r.contrato?.compania ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-700">{formatDate(r.fecha_vencimiento_contrato, 'short')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
