import { useState } from 'react'
import {
  AlertTriangle, Building2, Database, Info, Loader2,
  MapPin, RefreshCw, Wifi, WifiOff, Zap,
} from 'lucide-react'
import { useDatadisSupplies, type DatadisSupply } from './api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DISTRIBUTOR_NAMES: Record<string, string> = {
  '0021': 'I-DE (Iberdrola)',
  '0022': 'e-distribución (Endesa)',
  '0023': 'UFD (Gas Natural)',
  '0024': 'EDISTRIBUCIÓN (Naturgy)',
  '0031': 'EOSA',
  '0033': 'EREDES',
  '0029': 'UFD Distribución',
  '0026': 'Viesgo / E.ON',
}

function distributorName(code: string) {
  return DISTRIBUTOR_NAMES[code] ?? code
}

const TARIFF_COLORS: Record<string, string> = {
  '2.0TD': 'bg-emerald-100 text-emerald-700',
  '3.0TD': 'bg-blue-100 text-blue-700',
  '6.1TD': 'bg-purple-100 text-purple-700',
  '6.2TD': 'bg-purple-100 text-purple-700',
  '6.3TD': 'bg-purple-100 text-purple-700',
  '6.4TD': 'bg-purple-100 text-purple-700',
}

function tariffBadge(tariff?: string) {
  if (!tariff) return null
  const cls = TARIFF_COLORS[tariff] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {tariff}
    </span>
  )
}

const POINT_TYPE: Record<number, string> = {
  1: 'Tipo 1',
  2: 'Tipo 2',
  3: 'Tipo 3',
  4: 'Tipo 4',
  5: 'Tipo 5',
}

// ─── Sub-componente: Fila de suministro ──────────────────────────────────────

function SupplyRow({ supply, idx }: { supply: DatadisSupply; idx: number }) {
  const [open, setOpen] = useState(false)

  const cups = supply.cups ?? '—'
  const distributor = supply.distributor ?? supply['cod_disitribuidora'] as string ?? '—'
  const tariff = supply.tariff ?? supply['tarifa'] as string ?? supply['tarifaCode'] as string
  const province = supply.province ?? supply['provincia'] as string
  const municipality = supply.municipality ?? supply['municipio'] as string
  const pointType = supply.pointType ?? supply['tipoPuntoMedida'] as number

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
        }`}
        onClick={() => setOpen(o => !o)}
      >
        {/* CUPS */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="font-mono text-xs font-medium text-slate-800">{cups}</span>
          </div>
        </td>

        {/* Distribuidora */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-xs text-slate-700">{distributorName(distributor)}</span>
          </div>
        </td>

        {/* Tarifa */}
        <td className="px-4 py-3">{tariffBadge(tariff)}</td>

        {/* Ubicación */}
        <td className="px-4 py-3">
          {(province || municipality) ? (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {municipality && <span>{municipality}</span>}
              {province && municipality && <span>·</span>}
              {province && <span>{province}</span>}
            </div>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>

        {/* Tipo punto */}
        <td className="px-4 py-3">
          <span className="text-xs text-slate-500">{POINT_TYPE[pointType] ?? '—'}</span>
        </td>

        {/* Expand */}
        <td className="px-4 py-3 text-right">
          <span className="text-[10px] text-slate-400">{open ? '▲' : '▼'}</span>
        </td>
      </tr>

      {/* Panel expandido con todos los campos raw */}
      {open && (
        <tr className="bg-blue-50/50">
          <td colSpan={6} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 md:grid-cols-4">
              {Object.entries(supply).map(([k, v]) => (
                v !== null && v !== undefined && v !== '' ? (
                  <div key={k} className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</span>
                    <span className="block truncate font-mono text-xs text-slate-700">{String(v)}</span>
                  </div>
                ) : null
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function DatadisPage() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDatadisSupplies()

  const supplies = data?.response ?? []
  const errorSupplies = data?.errorSupplies ?? []
  const isPartialResponse = data?.CodError === '902'

  // Agrupar por distribuidora para los KPIs
  const byDistributor = supplies.reduce<Record<string, number>>((acc, s) => {
    const d = s.distributor ?? s['cod_disitribuidora'] as string ?? 'Desconocida'
    acc[d] = (acc[d] ?? 0) + 1
    return acc
  }, {})

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Datadis</h1>
              <p className="text-xs text-slate-500">Suministros del NIF autorizado en la plataforma Datadis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── Cargando ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Conectando con Datadis…</span>
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <WifiOff className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Error al conectar con Datadis</p>
              <p className="text-xs text-red-600 mt-0.5">{error instanceof Error ? error.message : 'Error desconocido'}</p>
            </div>
          </div>
        )}

        {/* ── Contenido ── */}
        {!isLoading && !isError && data && (
          <>
            {/* Warning CodError 902 */}
            {isPartialResponse && errorSupplies.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Respuesta parcial de Datadis (CodError 902)</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Algunas distribuidoras no respondieron a tiempo. Los suministros de{' '}
                    <span className="font-semibold">
                      {errorSupplies.map(e => e.distributor ?? e.cups ?? '?').join(', ')}
                    </span>{' '}
                    pueden estar incompletos. Reintenta más tarde o accede directamente al portal de Datadis.
                  </p>
                </div>
              </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Suministros</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{supplies.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Distribuidoras</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{Object.keys(byDistributor).length}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">Sin respuesta</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{errorSupplies.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actualizado</p>
                <p className="mt-1 text-sm font-bold text-slate-700 flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  {lastUpdated ?? '—'}
                </p>
              </div>
            </div>

            {/* Desglose por distribuidora */}
            {Object.keys(byDistributor).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Desglose por distribuidora
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byDistributor).map(([code, count]) => (
                    <span key={code} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                      <span className="font-semibold text-slate-700">{distributorName(code)}</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-px text-[10px] font-bold text-blue-700">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla de suministros */}
            {supplies.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Listado de suministros</span>
                  <span className="text-[11px] text-slate-400">Haz clic en una fila para ver todos los campos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">CUPS</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Distribuidora</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tarifa</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ubicación</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipo</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {supplies.map((supply, idx) => (
                        <SupplyRow key={supply.cups ?? idx} supply={supply} idx={idx} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <Database className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No se encontraron suministros</p>
                <p className="mt-1 text-xs text-slate-400">
                  Comprueba que las credenciales Datadis están configuradas y que el NIF tiene suministros autorizados.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
