import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Download, X, ArrowLeft } from 'lucide-react'
import { fetchConsumosDiarios } from '../api'
import { agruparPorMes, backfillIncompleto, csvDiario } from '../curva'

/**
 * PR-4.1 · Curva de consumo en la pestaña Suministros (semana 4, L2/L5).
 * Mensual por defecto; clic en un mes = zoom diario. CSV con el diario completo.
 * Honestidad L3: 🟡 si el backfill está incompleto; sin datos = aviso, no error.
 */
export default function CurvaConsumo({ cupsId, codigoCups, onClose }: {
  cupsId: string
  codigoCups: string
  onClose: () => void
}) {
  const [mesZoom, setMesZoom] = useState<string | null>(null)
  const { data: diarios = [], isLoading, error } = useQuery({
    queryKey: ['curva-diaria', cupsId],
    queryFn: () => fetchConsumosDiarios(cupsId),
    staleTime: 5 * 60_000,
  })

  const meses = useMemo(() => agruparPorMes(diarios), [diarios])
  const ultimaFecha = diarios.length ? diarios[diarios.length - 1].fecha : null
  const incompleto = useMemo(() => backfillIncompleto(meses, ultimaFecha), [meses, ultimaFecha])
  const datosMes = useMemo(
    () => (mesZoom ? diarios.filter((d) => d.fecha.startsWith(mesZoom)) : []),
    [diarios, mesZoom],
  )

  function descargarCsv() {
    const blob = new Blob(['\ufeff' + csvDiario(codigoCups, diarios)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consumos_${codigoCups}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtMes = (m: string) => {
    const [y, mm] = m.split('-')
    return `${mm}/${y.slice(2)}`
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {mesZoom && (
            <button
              onClick={() => setMesZoom(null)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Mensual
            </button>
          )}
          <h4 className="text-sm font-semibold text-slate-900">
            Curva de consumo · <span className="font-mono text-xs">{codigoCups}</span>
            {mesZoom && <span className="ml-1 text-slate-500">· {fmtMes(mesZoom)} (diario)</span>}
          </h4>
          {incompleto && !isLoading && diarios.length > 0 && (
            <span
              className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
              title="Faltan días o el dato no está al día: el backfill de Datadis sigue en curso o el punto dejó de reportar"
            >
              🟡 backfill incompleto
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {diarios.length > 0 && (
            <button
              onClick={descargarCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              title="Descargar el diario completo en CSV"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar curva">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading && <div className="h-56 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />}
      {error != null && <p className="text-sm text-red-600">Error al cargar la curva. Reintenta o revisa la sesión.</p>}
      {!isLoading && error == null && diarios.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Este CUPS aún no tiene curva de consumo en el CRM. Llegará sola cuando Datadis
          la publique (autorización activa + ingesta nocturna); si el punto no está
          autorizado, no hay dato que traer.
        </p>
      )}
      {!isLoading && error == null && diarios.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {mesZoom ? (
              <BarChart data={datosMes} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tickFormatter={(f: string) => f.slice(8)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)} kWh`, 'Consumo']}
                  labelFormatter={(f) => new Date(String(f) + 'T00:00:00').toLocaleDateString('es-ES')}
                />
                <Bar dataKey="consumo_kwh" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart
                data={meses}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                onClick={(e: { activeLabel?: string | number }) => {
                  if (typeof e?.activeLabel === 'string') setMesZoom(e.activeLabel)
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(0)} kWh`, 'Consumo']}
                  labelFormatter={(m) => `${fmtMes(String(m))}${meses.find((x) => x.mes === m)?.completo === false ? ' · mes con huecos' : ''}`}
                />
                <Bar dataKey="consumo_kwh" radius={[3, 3, 0, 0]} fill="#2563eb" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {!mesZoom && diarios.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-400">Clic en un mes para ver el detalle diario.</p>
      )}
    </div>
  )
}
