import { useNavigate } from 'react-router-dom'
import { useContratosPorEmpresa } from '../../contratos/api'
import EstadoBadge from '../../contratos/components/EstadoBadge'
import { formatDate } from '../../../core/utils/dates'

/**
 * Pestaña Contratos de la ficha de empresa (PR-1.2, semana 1 CRM ÚTIL):
 * tabla con estado en color, CUPS, comercializadora y fechas.
 * Clic en una fila → detalle del contrato. Solo lectura.
 */
export default function ContratosTab({ empresaId }: { empresaId: string }) {
  const navigate = useNavigate()
  const { data: contratos = [], isLoading } = useContratosPorEmpresa(empresaId)

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    )
  }

  if (contratos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
        <p className="text-sm text-slate-500">Esta empresa no tiene contratos registrados</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {contratos.length} contrato{contratos.length === 1 ? '' : 's'} · clic en una fila para ver el detalle
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Comercializadora</th>
              <th className="px-3 py-2">CUPS</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contratos.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/contratos/${c.id}`)}
                className="cursor-pointer hover:bg-slate-50"
                title="Ver detalle del contrato"
              >
                <td className="px-3 py-2.5 font-medium text-slate-900">
                  {c.compania ?? '—'}
                  {c.numero_contrato && (
                    <span className="ml-2 text-xs font-normal text-slate-500">{c.numero_contrato}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-700">
                  {c.cups && c.cups.length > 0
                    ? c.cups.map((k) => k.codigo_cups).join(', ')
                    : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <EstadoBadge estado={c.estado} />
                </td>
                <td className="px-3 py-2.5 text-slate-700">{formatDate(c.fecha_inicio, 'short')}</td>
                <td className="px-3 py-2.5 text-slate-700">{formatDate(c.fecha_fin, 'short')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
