import { useMemo, useState } from 'react'
import ExportButton from '../../../core/components/ExportButton'
import {
  useInformeComercialMensual,
  useComercialesList,
  type ComercialMensualFila,
} from '../api'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function InformeComercialMensual() {
  const [mes, setMes] = useState<string>(currentMonth())
  const [comercialId, setComercialId] = useState<string>('')

  const comerciales = useComercialesList()
  const { data, isLoading, error } = useInformeComercialMensual(
    mes,
    comercialId || null,
  )

  const filas = useMemo(() => data ?? [], [data])

  const totales = useMemo<ComercialMensualFila | null>(() => {
    if (filas.length === 0) return null
    const t: ComercialMensualFila = {
      comercial_id: null,
      comercial_nombre: 'TOTAL',
      llamadas: 0, emails: 0, reuniones: 0, visitas: 0, tareas: 0,
      oportunidades_creadas: 0, oportunidades_ganadas: 0, oportunidades_perdidas: 0,
      contratos_firmados: 0, tasa_conversion_pct: 0,
    }
    for (const f of filas) {
      t.llamadas += f.llamadas
      t.emails += f.emails
      t.reuniones += f.reuniones
      t.visitas += f.visitas
      t.tareas += f.tareas
      t.oportunidades_creadas += f.oportunidades_creadas
      t.oportunidades_ganadas += f.oportunidades_ganadas
      t.oportunidades_perdidas += f.oportunidades_perdidas
      t.contratos_firmados += f.contratos_firmados
    }
    const cerradas = t.oportunidades_ganadas + t.oportunidades_perdidas
    t.tasa_conversion_pct = cerradas > 0 ? Math.round((t.oportunidades_ganadas / cerradas) * 100) : 0
    return t
  }, [filas])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="mes">Mes</label>
          <input
            id="mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="comercial">Comercial</label>
          <select
            id="comercial"
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
          <ExportButton<ComercialMensualFila>
            filename={`informe_comercial_${mes}`}
            fetchRows={async () => filas}
            columns={[
              { header: 'Comercial', value: (r) => r.comercial_nombre },
              { header: 'Llamadas', value: (r) => r.llamadas },
              { header: 'Emails', value: (r) => r.emails },
              { header: 'Reuniones', value: (r) => r.reuniones },
              { header: 'Visitas', value: (r) => r.visitas },
              { header: 'Tareas', value: (r) => r.tareas },
              { header: 'Oportunidades creadas', value: (r) => r.oportunidades_creadas },
              { header: 'Ganadas', value: (r) => r.oportunidades_ganadas },
              { header: 'Perdidas', value: (r) => r.oportunidades_perdidas },
              { header: 'Contratos firmados', value: (r) => r.contratos_firmados },
              { header: 'Tasa conversión (%)', value: (r) => r.tasa_conversion_pct },
            ]}
          />
        </div>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-slate-500">Calculando informe…</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Error al cargar: {(error as Error).message}</div>}

      {!isLoading && filas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Sin actividad en el periodo seleccionado.
        </div>
      )}

      {!isLoading && filas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Comercial</th>
                <th className="px-3 py-2 text-right">Llam.</th>
                <th className="px-3 py-2 text-right">Emails</th>
                <th className="px-3 py-2 text-right">Reun.</th>
                <th className="px-3 py-2 text-right">Visit.</th>
                <th className="px-3 py-2 text-right">Tareas</th>
                <th className="px-3 py-2 text-right">Op. creadas</th>
                <th className="px-3 py-2 text-right">Ganadas</th>
                <th className="px-3 py-2 text-right">Perdidas</th>
                <th className="px-3 py-2 text-right">Contratos</th>
                <th className="px-3 py-2 text-right">Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.comercial_id ?? '__none__'} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{f.comercial_nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.llamadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.emails}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.reuniones}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.visitas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.tareas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.oportunidades_creadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{f.oportunidades_ganadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{f.oportunidades_perdidas}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{f.contratos_firmados}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.tasa_conversion_pct}%</td>
                </tr>
              ))}
            </tbody>
            {totales && (
              <tfoot className="bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td className="px-3 py-2">{totales.comercial_nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.llamadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.emails}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.reuniones}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.visitas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.tareas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.oportunidades_creadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{totales.oportunidades_ganadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">{totales.oportunidades_perdidas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.contratos_firmados}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.tasa_conversion_pct}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
