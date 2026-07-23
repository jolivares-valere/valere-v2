import { Link } from 'react-router-dom'
import { Sun, CheckCircle2, XCircle, Pencil } from 'lucide-react'
import type { SuministroRow } from '../api'

function tarifaBadge(t: string | null) {
  if (!t) return <span className="text-xs text-slate-400">—</span>
  const color =
    t.startsWith('6') ? 'bg-purple-50 text-purple-700' :
    t.startsWith('3') ? 'bg-blue-50 text-blue-700' :
    'bg-slate-50 text-slate-600'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{t}</span>
}

// Umbral de frescura de curva: si la última fecha tiene más de 45 días,
// la curva existe pero está incompleta/parada → 🟡 honesto (patrón L3).
const CURVA_FRESCA_DIAS = 45

function curvaBadge(ultimaFecha: string | null | undefined) {
  if (!ultimaFecha) {
    return <span className="text-xs text-slate-400" title="Sin curva de consumo en el CRM">—</span>
  }
  const dias = Math.floor((Date.now() - new Date(ultimaFecha).getTime()) / 86_400_000)
  const fecha = new Date(ultimaFecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
  if (dias <= CURVA_FRESCA_DIAS) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700" title={`Curva horaria disponible hasta ${fecha}`}>
        🟢 hasta {fecha}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700" title={`Curva incompleta: última fecha ${fecha} (hace ${dias} días)`}>
      🟡 hasta {fecha}
    </span>
  )
}

function estadoBadge(estado: string) {
  const base = 'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize'
  if (estado === 'activo') return <span className={`${base} bg-emerald-50 text-emerald-700`}>{estado}</span>
  if (estado === 'baja') return <span className={`${base} bg-red-50 text-red-700`}>{estado}</span>
  return <span className={`${base} bg-slate-100 text-slate-600`}>{estado}</span>
}

/** Tabla de suministros (CUPS) reutilizada por la pestaña y por la página global. */
export default function SuministrosTable({
  rows,
  showEmpresa = false,
  curva,
  onVerCurva,
  onEditar,
}: {
  rows: SuministroRow[]
  showEmpresa?: boolean
  /** Mapa cups_id → última fecha con curva; si se pasa, pinta la columna Curva. */
  curva?: Record<string, string | null>
  /** PR-4.1: si se pasa, la columna Curva ofrece "Ver" (abre la gráfica). */
  onVerCurva?: (row: SuministroRow) => void
  /** F2: si se pasa, cada fila muestra un botón "Editar" (CUPS y demás datos). */
  onEditar?: (row: SuministroRow) => void
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Sin suministros registrados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {showEmpresa && <th className="px-3 py-2">Empresa</th>}
            <th className="px-3 py-2">CUPS</th>
            <th className="px-3 py-2">Tarifa</th>
            <th className="px-3 py-2 text-center">Pot. (kW)</th>
            <th className="px-3 py-2">Dirección suministro</th>
            <th className="px-3 py-2">Comercializadora</th>
            <th className="px-3 py-2 text-center">FV</th>
            <th className="px-3 py-2 text-center">Datadis</th>
            {curva && <th className="px-3 py-2">Curva</th>}
            <th className="px-3 py-2">Estado</th>
            {onEditar && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const pot = r.p1_kw ?? r.p6_kw
            const tieneFV = r.potencia_fv_kwp != null || !!r.modelo_autoconsumo
            return (
              <tr key={r.id} className="hover:bg-slate-50/50">
                {showEmpresa && (
                  <td className="max-w-[160px] truncate px-3 py-2">
                    <Link
                      to={`/empresas/${r.empresa_id}`}
                      className="font-medium text-slate-800 hover:text-valere-blue-dark hover:underline"
                      title={r.empresa_nombre}
                    >
                      {r.empresa_nombre}
                    </Link>
                  </td>
                )}
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.codigo_cups}</td>
                <td className="px-3 py-2">{tarifaBadge(r.tarifa_acceso)}</td>
                <td className="px-3 py-2 text-center text-slate-600">
                  {pot != null ? Number(pot).toFixed(0) : '—'}
                </td>
                <td
                  className="max-w-[240px] truncate px-3 py-2 text-xs text-slate-500"
                  title={r.direccion_suministro ?? undefined}
                >
                  {r.direccion_suministro ?? r.denominacion ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.comercializadora_actual ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  {tieneFV ? (
                    <span
                      className="inline-flex"
                      title={r.potencia_fv_kwp != null ? `FV ${r.potencia_fv_kwp} kWp` : 'Con autoconsumo FV'}
                    >
                      <Sun className="h-4 w-4 text-amber-500" />
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.datadis_sincronizado ? (
                    <span className="inline-flex" title="Sincronizado con Datadis">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </span>
                  ) : (
                    <span className="inline-flex" title="Sin sincronizar">
                      <XCircle className="h-4 w-4 text-slate-300" />
                    </span>
                  )}
                </td>
                {curva && (
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {curvaBadge(curva[r.id])}
                      {onVerCurva && (
                        <button
                          onClick={() => onVerCurva(r)}
                          className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                          title={curva[r.id] ? 'Ver curva de consumo' : 'Ver estado de la curva (sin datos aún)'}
                        >
                          Ver
                        </button>
                      )}
                    </span>
                  </td>
                )}
                <td className="px-3 py-2">{estadoBadge(r.estado)}</td>
                {onEditar && (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onEditar(r)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                      title="Editar suministro"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
