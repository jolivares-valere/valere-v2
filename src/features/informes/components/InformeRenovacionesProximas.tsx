import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExportButton from '../../../core/components/ExportButton'
import { formatDate } from '../../../core/utils/dates'
import { useComercialesList, useInformeRenovacionesProximas, type RenovacionFila } from '../api'

function formatInt(n: number): string {
  return new Intl.NumberFormat('es-ES').format(Math.round(n))
}

function colorDias(d: number): string {
  if (d < 30) return 'bg-red-100 text-red-700'
  if (d < 60) return 'bg-orange-100 text-orange-700'
  return 'bg-amber-100 text-amber-700'
}

export default function InformeRenovacionesProximas() {
  const [ventana, setVentana] = useState<number>(90)
  const [comercialId, setComercialId] = useState<string>('')
  const comerciales = useComercialesList()
  const { data, isLoading, error } = useInformeRenovacionesProximas(ventana, comercialId || null)

  const filas = useMemo(() => data ?? [], [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="ventana-renov">Ventana</label>
          <select
            id="ventana-renov"
            value={ventana}
            onChange={(e) => setVentana(Number(e.target.value))}
            className="mt-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
            <option value={180}>180 días</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="comercial-renov">Comercial</label>
          <select
            id="comercial-renov"
            value={comercialId}
            onChange={(e) => setComercialId(e.target.value)}
            className="mt-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {(comerciales.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <ExportButton<RenovacionFila>
            filename={`renovaciones_${ventana}d`}
            fetchRows={async () => filas}
            columns={[
              { header: 'CUPS', value: (r) => r.codigo_cups },
              { header: 'Empresa', value: (r) => r.empresa_nombre },
              { header: 'Contrato', value: (r) => r.numero_contrato },
              { header: 'Comercializadora actual', value: (r) => r.compania },
              { header: 'Tarifa', value: (r) => r.tarifa_acceso },
              { header: 'Fin contrato', value: (r) => formatDate(r.fecha_fin) },
              { header: 'Días restantes', value: (r) => r.dias_restantes },
              { header: 'Consumo (kWh)', value: (r) => Math.round(r.consumo_kwh) },
              { header: 'Comercial', value: (r) => r.comercial_nombre },
            ]}
          />
        </div>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-slate-500">Cargando renovaciones…</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Error al cargar: {(error as Error).message}</div>}

      {!isLoading && filas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No hay contratos próximos a vencer en {ventana} días.
        </div>
      )}

      {!isLoading && filas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">CUPS</th>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Comercializadora</th>
                <th className="px-3 py-2 text-left">Tarifa</th>
                <th className="px-3 py-2 text-left">Fin contrato</th>
                <th className="px-3 py-2 text-right">Días</th>
                <th className="px-3 py-2 text-right">Consumo (kWh)</th>
                <th className="px-3 py-2 text-left">Comercial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.contrato_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{f.codigo_cups ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Link to={`/empresas/${f.empresa_id}`} className="font-medium text-slate-900 hover:underline">
                      {f.empresa_nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{f.compania ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{f.tarifa_acceso ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(f.fecha_fin)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${colorDias(f.dias_restantes)}`}>
                      {f.dias_restantes}d
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatInt(f.consumo_kwh)}</td>
                  <td className="px-3 py-2 text-slate-600">{f.comercial_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
