import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExportButton from '../../../core/components/ExportButton'
import { formatDate } from '../../../core/utils/dates'
import { useComercialesList, useInformePipeline, type PipelineFila } from '../api'

const ETAPA_LABEL: Record<string, string> = {
  prospecto: 'Prospecto',
  auditoria_consumo: 'Auditoría',
  oferta_presentada: 'Oferta presentada',
  negociacion: 'Negociación',
  contrato_firmado: 'Contrato firmado',
  activo: 'Activo',
  contactado: 'Contactado',
  analisis: 'Análisis',
  propuesta_enviada: 'Propuesta enviada',
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function InformePipeline() {
  const [comercialId, setComercialId] = useState<string>('')
  const comerciales = useComercialesList()
  const { data, isLoading, error } = useInformePipeline(comercialId || null)

  const filas = useMemo(() => data ?? [], [data])
  const totales = useMemo(() => {
    const t = { count: filas.length, valor: 0, ahorro: 0 }
    for (const f of filas) {
      t.valor += f.valor_estimado_eur
      t.ahorro += f.ahorro_anual_estimado
    }
    return t
  }, [filas])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="comercial-pipeline">Comercial</label>
          <select
            id="comercial-pipeline"
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
          <ExportButton<PipelineFila>
            filename="pipeline_oportunidades"
            fetchRows={async () => filas}
            columns={[
              { header: 'Oportunidad', value: (r) => r.nombre },
              { header: 'Empresa', value: (r) => r.empresa_nombre },
              { header: 'Comercial', value: (r) => r.comercial_nombre },
              { header: 'Etapa', value: (r) => ETAPA_LABEL[r.etapa] ?? r.etapa },
              { header: 'Valor estimado (€)', value: (r) => Math.round(r.valor_estimado_eur) },
              { header: 'Ahorro anual (€)', value: (r) => Math.round(r.ahorro_anual_estimado) },
              { header: 'Probabilidad (%)', value: (r) => r.probabilidad_pct },
              { header: 'Cierre previsto', value: (r) => formatDate(r.fecha_cierre_prevista) },
              { header: 'Días en etapa', value: (r) => r.dias_en_etapa },
            ]}
          />
        </div>
      </div>

      {!isLoading && filas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Oportunidades</p>
            <p className="text-xl font-bold text-slate-900">{totales.count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Valor pipeline</p>
            <p className="text-xl font-bold text-slate-900">{formatEur(totales.valor)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Ahorro anual estimado</p>
            <p className="text-xl font-bold text-emerald-700">{formatEur(totales.ahorro)}</p>
          </div>
        </div>
      )}

      {isLoading && <div className="py-12 text-center text-sm text-slate-500">Cargando pipeline…</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Error al cargar: {(error as Error).message}</div>}

      {!isLoading && filas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No hay oportunidades abiertas para este comercial.
        </div>
      )}

      {!isLoading && filas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Oportunidad</th>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Comercial</th>
                <th className="px-3 py-2 text-left">Etapa</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-right">Ahorro/año</th>
                <th className="px-3 py-2 text-right">Prob.</th>
                <th className="px-3 py-2 text-left">Cierre prev.</th>
                <th className="px-3 py-2 text-right">Días sin act.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link to="/oportunidades" className="font-medium text-slate-900 hover:underline">
                      {f.nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    <Link to={`/empresas/${f.empresa_id}`} className="hover:underline">
                      {f.empresa_nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{f.comercial_nombre}</td>
                  <td className="px-3 py-2 text-slate-700">{ETAPA_LABEL[f.etapa] ?? f.etapa}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEur(f.valor_estimado_eur)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{formatEur(f.ahorro_anual_estimado)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.probabilidad_pct ?? '—'}{f.probabilidad_pct != null ? '%' : ''}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(f.fecha_cierre_prevista)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${f.dias_en_etapa > 30 ? 'text-orange-700 font-semibold' : 'text-slate-600'}`}>
                    {f.dias_en_etapa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
