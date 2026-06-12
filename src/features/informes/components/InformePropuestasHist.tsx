import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExportButton from '../../../core/components/ExportButton'
import { formatDate } from '../../../core/utils/dates'
import { useComercialesList, useInformePropuestasHist, type PropuestaHistFila } from '../api'

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  vista: 'Vista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  caducada: 'Caducada',
}

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  enviada: 'bg-blue-100 text-blue-700',
  vista: 'bg-indigo-100 text-indigo-700',
  aceptada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
  caducada: 'bg-amber-100 text-amber-700',
}

function formatEur(n: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function InformePropuestasHist() {
  const [comercialId, setComercialId] = useState<string>('')
  const comerciales = useComercialesList()
  const { data, isLoading, error } = useInformePropuestasHist(comercialId || null)

  const filas = useMemo(() => data ?? [], [data])

  const totales = useMemo(() => {
    const t = { total: filas.length, enviadas: 0, aceptadas: 0, rechazadas: 0, comision: 0 }
    for (const f of filas) {
      if (f.estado === 'enviada' || f.estado === 'vista') t.enviadas++
      if (f.estado === 'aceptada') t.aceptadas++
      if (f.estado === 'rechazada') t.rechazadas++
      t.comision += f.comision_estimada ?? 0
    }
    return t
  }, [filas])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="comercial-prop">Comercial</label>
          <select
            id="comercial-prop"
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
          <ExportButton<PropuestaHistFila>
            filename="propuestas_historico"
            fetchRows={async () => filas}
            columns={[
              { header: 'Empresa', value: (r) => r.empresa_nombre },
              { header: 'Oportunidad', value: (r) => r.oportunidad_nombre },
              { header: 'Versión', value: (r) => r.version },
              { header: 'Comercializadora', value: (r) => r.compania_propuesta },
              { header: 'Estado', value: (r) => ESTADO_LABEL[r.estado] ?? r.estado },
              { header: 'Fecha envío', value: (r) => formatDate(r.fecha_envio) },
              { header: 'Fecha respuesta', value: (r) => formatDate(r.fecha_respuesta) },
              { header: 'Ahorro estimado (%)', value: (r) => r.ahorro_estimado_pct },
              { header: 'Comisión estimada (€)', value: (r) => r.comision_estimada },
            ]}
          />
        </div>
      </div>

      {!isLoading && filas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Propuestas</p>
            <p className="text-xl font-bold text-slate-900">{totales.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Enviadas/Vistas</p>
            <p className="text-xl font-bold text-blue-700">{totales.enviadas}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Aceptadas</p>
            <p className="text-xl font-bold text-emerald-700">{totales.aceptadas}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase text-slate-500">Comisión estimada</p>
            <p className="text-xl font-bold text-slate-900">{formatEur(totales.comision)}</p>
          </div>
        </div>
      )}

      {isLoading && <div className="py-12 text-center text-sm text-slate-500">Cargando propuestas…</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Error al cargar: {(error as Error).message}</div>}

      {!isLoading && filas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aún no hay propuestas registradas en el sistema.
        </div>
      )}

      {!isLoading && filas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Oportunidad</th>
                <th className="px-3 py-2 text-right">v.</th>
                <th className="px-3 py-2 text-left">Comercializadora</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Envío</th>
                <th className="px-3 py-2 text-left">Respuesta</th>
                <th className="px-3 py-2 text-right">Ahorro %</th>
                <th className="px-3 py-2 text-right">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {f.empresa_id ? (
                      <Link to={`/empresas/${f.empresa_id}`} className="font-medium text-slate-900 hover:underline">
                        {f.empresa_nombre}
                      </Link>
                    ) : (
                      <span className="text-slate-700">{f.empresa_nombre}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{f.oportunidad_nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{f.version}</td>
                  <td className="px-3 py-2 text-slate-600">{f.compania_propuesta ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[f.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                      {ESTADO_LABEL[f.estado] ?? f.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(f.fecha_envio)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(f.fecha_respuesta)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{f.ahorro_estimado_pct != null ? `${f.ahorro_estimado_pct}%` : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEur(f.comision_estimada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
