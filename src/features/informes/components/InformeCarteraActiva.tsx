import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExportButton from '../../../core/components/ExportButton'
import { formatDate } from '../../../core/utils/dates'
import { useComercialesList, useInformeCarteraActiva, type CarteraActivaFila } from '../api'

function formatInt(n: number): string {
  return new Intl.NumberFormat('es-ES').format(Math.round(n))
}
function formatEur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function InformeCarteraActiva() {
  const [comercialId, setComercialId] = useState<string>('')
  const comerciales = useComercialesList()
  const { data, isLoading, error } = useInformeCarteraActiva(comercialId || null)

  const filas = useMemo(() => data ?? [], [data])

  const totales = useMemo(() => {
    const t = { contratos: 0, cups: 0, consumo: 0, comision: 0 }
    for (const f of filas) {
      t.contratos += f.contratos_activos
      t.cups += f.cups_activos
      t.consumo += f.consumo_total_kwh
      t.comision += f.comision_total_eur
    }
    return t
  }, [filas])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="comercial-cartera">Comercial</label>
          <select
            id="comercial-cartera"
            value={comercialId}
            onChange={(e) => setComercialId(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {(comerciales.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <ExportButton<CarteraActivaFila>
            filename="cartera_activa"
            fetchRows={async () => filas}
            columns={[
              { header: 'Empresa', value: (r) => r.empresa_nombre },
              { header: 'NIF', value: (r) => r.empresa_nif },
              { header: 'Comercial', value: (r) => r.comercial_nombre },
              { header: 'Contratos activos', value: (r) => r.contratos_activos },
              { header: 'CUPS activos', value: (r) => r.cups_activos },
              { header: 'Consumo total (kWh)', value: (r) => Math.round(r.consumo_total_kwh) },
              { header: 'Comisión total (€)', value: (r) => Math.round(r.comision_total_eur) },
              { header: 'Próximo vencimiento', value: (r) => formatDate(r.proximo_vencimiento) },
            ]}
          />
        </div>
      </div>

      {!isLoading && filas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Empresas</p>
            <p className="text-xl font-bold text-slate-900">{filas.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Contratos activos</p>
            <p className="text-xl font-bold text-slate-900">{formatInt(totales.contratos)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Consumo total</p>
            <p className="text-xl font-bold text-slate-900">{formatInt(totales.consumo)} kWh</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Comisión total</p>
            <p className="text-xl font-bold text-slate-900">{formatEur(totales.comision)}</p>
          </div>
        </div>
      )}

      {isLoading && <div className="py-12 text-center text-sm text-slate-500">Cargando cartera…</div>}
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">Error al cargar: {(error as Error).message}</div>}

      {!isLoading && filas.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No hay empresas con contratos activos para este comercial.
        </div>
      )}

      {!isLoading && filas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Comercial</th>
                <th className="px-3 py-2 text-right">Contratos</th>
                <th className="px-3 py-2 text-right">CUPS</th>
                <th className="px-3 py-2 text-right">Consumo (kWh)</th>
                <th className="px-3 py-2 text-right">Comisión</th>
                <th className="px-3 py-2 text-left">Próx. vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.empresa_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link to={`/empresas/${f.empresa_id}`} className="font-medium text-slate-900 hover:underline">
                      {f.empresa_nombre}
                    </Link>
                    {f.empresa_nif && <span className="ml-2 text-xs text-slate-500">{f.empresa_nif}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{f.comercial_nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.contratos_activos}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.cups_activos}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatInt(f.consumo_total_kwh)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEur(f.comision_total_eur)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(f.proximo_vencimiento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
