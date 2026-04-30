import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Calendar, ChevronDown, ChevronUp,
  Database, FileText, Loader2, MapPin, RefreshCw,
  TrendingUp, Wifi, WifiOff, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  useDatadisSupplies,
  useDatadisContractual,
  useDatadisConsumption,
  useDatadisMaxPower,
  useDatadisReactive,
  type DatadisSupply,
  type DatadisContractualData,
  type DatadisConsumptionPoint,
} from './api'

// ─── Colores periodo tarifario (P1..P6) ──────────────────────────────────────
const PERIOD_COLORS = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#3b82f6',
  P4: '#8b5cf6',
  P5: '#10b981',
  P6: '#6b7280',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distributorName(code: string) {
  const MAP: Record<string, string> = {
    '0021': 'I-DE (Iberdrola)',
    '0022': 'e-distribucion (Endesa)',
    '0023': 'UFD (Gas Natural)',
    '0024': 'EDISTRIBUCION (Naturgy)',
    '0031': 'EOSA',
    '0033': 'EREDES',
    '0029': 'UFD Distribucion',
    '0026': 'Viesgo / E.ON',
  }
  return MAP[code] ?? code
}

function formatCups(cups: string) {
  if (cups.length <= 14) return cups
  return `${cups.slice(0, 10)}...${cups.slice(-6)}`
}

function isoToDisplay(date: string) {
  if (!date) return '---'
  return date.replace(/\//g, '-')
}

// Obtener rango de fechas (mes actual y 12 meses atras)
function getDateRange(monthsBack = 1) {
  const now  = new Date()
  const end  = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  const past = new Date(now)
  past.setMonth(past.getMonth() - monthsBack)
  const start = `${past.getFullYear()}/${String(past.getMonth() + 1).padStart(2, '0')}/01`
  return { start, end }
}

// ─── Tab: Informacion ─────────────────────────────────────────────────────────

function InfoTab({ supply }: { supply: DatadisSupply }) {
  const fields: [string, string][] = [
    ['CUPS', supply.cups ?? '---'],
    ['Distribuidor', distributorName(supply.distributor ?? '')],
    ['Tarifa', (supply.tariff ?? supply['tarifaCode'] as string ?? '---')],
    ['Tipo punto', `Tipo ${supply.pointType ?? supply['tipoPuntoMedida'] ?? '---'}`],
    ['Municipio', (supply.municipality ?? supply['municipio'] as string ?? '---')],
    ['Provincia', (supply.province ?? (supply['provincia'] as unknown as string) ?? '---')],
    ['Codigo postal', (supply.postalCode ?? (supply['codPostal'] as unknown as string) ?? '---')],
    ['Tension', (supply.tension ?? (supply['tension'] as unknown as string) ?? '---')],
    ['Validez desde', isoToDisplay(supply.validDateFrom ?? (supply['validDateFrom'] as unknown as string) ?? '')],
    ['Validez hasta', isoToDisplay(supply.validDateTo ?? (supply['validDateTo'] as unknown as string) ?? '')],
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
        Datos del suministro
      </h3>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        {fields.map(([label, val]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 font-mono text-xs text-slate-700">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Todos los campos Datadis
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(supply).map(([k, v]) =>
            v !== null && v !== undefined && v !== '' ? (
              <div key={k} className="min-w-0">
                <span className="block text-[10px] text-slate-400">{k}</span>
                <span className="block truncate font-mono text-[11px] text-slate-600">{String(v)}</span>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Contrato ────────────────────────────────────────────────────────────

function ContractTab({
  isLoading,
  isError,
  contract,
}: {
  isLoading: boolean
  isError: boolean
  contract: DatadisContractualData | undefined
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando datos contractuales...</span>
      </div>
    )
  }
  if (isError || !contract) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
        <WifiOff className="mx-auto mb-2 h-8 w-8 text-red-300" />
        <p className="text-sm font-medium text-red-600">No se pudieron cargar los datos contractuales</p>
        <p className="mt-1 text-xs text-red-400">
          Verifica que el punto tiene datos en Datadis y reintenta.
        </p>
      </div>
    )
  }

  const potencias: [string, number | undefined][] = [
    ['P1', contract.contractedPowerkWP1],
    ['P2', contract.contractedPowerkWP2],
    ['P3', contract.contractedPowerkWP3],
    ['P4', contract.contractedPowerkWP4],
    ['P5', contract.contractedPowerkWP5],
    ['P6', contract.contractedPowerkWP6],
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          Datos del contrato
        </h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            ['Tarifa acceso', contract.accessFare ?? (contract['accesFare'] as unknown as string) ?? '---'],
            ['Comercializadora', contract.marketer ?? (contract['marketer'] as unknown as string) ?? '---'],
            ['Distribuidor', contract.distributor ?? '---'],
            ['Tension', contract.tension ?? '---'],
            ['Inicio contrato', isoToDisplay(contract.startDate ?? '')],
            ['Fin contrato', isoToDisplay(contract.endDate ?? '')],
          ].map(([label, val]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">{val}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          Potencias contratadas (kW)
        </h3>
        <div className="flex flex-wrap gap-3">
          {potencias.map(([p, kw]) => (
            <div
              key={p}
              className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 min-w-[72px]"
            >
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: PERIOD_COLORS[p as keyof typeof PERIOD_COLORS] }}
              >
                {p}
              </span>
              <span className="mt-1 text-lg font-bold text-slate-800">
                {kw != null ? kw.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '---'}
              </span>
              <span className="text-[10px] text-slate-400">kW</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Curva ───────────────────────────────────────────────────────────────

type CurveRange = '7d' | '30d' | '3m'

function buildChartData(points: DatadisConsumptionPoint[]) {
  // Agrupa por dia sumando kWh
  const byDay: Record<string, number> = {}
  for (const p of points) {
    if (!p.date) continue
    const key = p.date.replace(/\//g, '-')
    byDay[key] = (byDay[key] ?? 0) + (p.consumptionKWh ?? 0)
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kwh]) => ({ date, kwh: Math.round(kwh * 100) / 100 }))
}

function CurveTab({
  supply,
  creds,
}: {
  supply: DatadisSupply
  creds?: { username: string; password: string }
}) {
  const [range, setRange] = useState<CurveRange>('30d')

  const monthsBack = range === '7d' ? 0 : range === '30d' ? 1 : 3

  const dates = useMemo(() => {
    const { start, end } = getDateRange(monthsBack)
    return { start, end }
  }, [monthsBack])

  const cups       = supply.cups
  const distributor = supply.distributor ?? (supply['cod_disitribuidora'] as string) ?? ''
  const province   = (supply.cod_provincia as string) ?? (supply['cod_provincia'] as string) ?? '41'
  const municipio  = (supply.cod_municipio as string) ?? (supply['cod_municipio'] as string) ?? '041091'
  const tariff     = supply.tariff ?? (supply['tarifaCode'] as string) ?? '3.0TD'
  const pointType  = (supply.pointType ?? (supply['tipoPuntoMedida'] as number) ?? 5) as number

  const { data, isLoading, isError } = useDatadisConsumption(
    cups && distributor ? {
      cups,
      distributor,
      fechaInicial: dates.start,
      fechaFinal:   dates.end,
      provinceCode: province,
      municipioCode: municipio,
      tarifaCode:   tariff,
      tipoPuntoMedida: pointType,
    } : null,
    creds,
  )

  const chartData = useMemo(() => buildChartData(Array.isArray(data) ? data : []), [data])
  const totalKwh  = chartData.reduce((s, d) => s + d.kwh, 0)
  const maxKwh    = chartData.length ? Math.max(...chartData.map(d => d.kwh)) : 0
  const avgKwh    = chartData.length ? totalKwh / chartData.length : 0

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center gap-2">
        {(['7d', '30d', '3m'] as CurveRange[]).map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              range === r
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {r === '7d' ? '7 dias' : r === '30d' ? '30 dias' : '3 meses'}
          </button>
        ))}
      </div>

      {/* KPI strip mini */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Total', `${totalKwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kWh`],
          ['Maximo dia', `${maxKwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kWh`],
          ['Media dia', `${avgKwh.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kWh`],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{val}</p>
          </div>
        ))}
      </div>

      {/* Grafico */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {isLoading && (
          <div className="flex h-48 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando curva de consumo...</span>
          </div>
        )}
        {isError && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <WifiOff className="h-8 w-8 text-slate-300" />
            <p className="text-sm">No se pudo cargar la curva de consumo</p>
          </div>
        )}
        {!isLoading && !isError && chartData.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <Database className="h-8 w-8 text-slate-200" />
            <p className="text-sm">Sin datos para el periodo seleccionado</p>
          </div>
        )}
        {!isLoading && !isError && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="consumoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={v => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={v => `${v}`}
                unit=" kWh"
                width={60}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(v: unknown) => [`${(v as number).toLocaleString('es-ES', { maximumFractionDigits: 1 })} kWh`, 'Consumo']}
              />
              <Area
                type="monotone"
                dataKey="kwh"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#consumoGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Cierres ─────────────────────────────────────────────────────────────

function CierresTab({
  supply,
  creds,
}: {
  supply: DatadisSupply
  creds?: { username: string; password: string }
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const dates = useMemo(() => getDateRange(12), [])

  const cups       = supply.cups
  const distributor = supply.distributor ?? (supply['cod_disitribuidora'] as string) ?? ''
  const province   = (supply.cod_provincia as string) ?? '41'
  const tariff     = supply.tariff ?? (supply['tarifaCode'] as string) ?? '3.0TD'

  const { data: maxPower, isLoading: loadingMax } = useDatadisMaxPower(
    cups && distributor ? {
      cups,
      distributor,
      fechaInicial: dates.start,
      fechaFinal:   dates.end,
      provinceCode: province,
      tarifaCode:   tariff,
    } : null,
    creds,
  )

  const { data: reactive, isLoading: loadingReact } = useDatadisReactive(
    cups && distributor ? {
      cups,
      distributor,
      fechaInicial: dates.start,
      fechaFinal:   dates.end,
      provinceCode: province,
      tarifaCode:   tariff,
    } : null,
    creds,
  )

  const isLoading = loadingMax || loadingReact

  // Agrupar maxPower por mes y periodo
  const maxByMonth = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    if (!Array.isArray(maxPower)) return result
    for (const p of maxPower) {
      const month = (p.date ?? '').slice(0, 7).replace(/\//g, '-')
      if (!month) continue
      if (!result[month]) result[month] = {}
      const per = `P${p.period ?? 1}`
      result[month][per] = Math.max(result[month][per] ?? 0, p.maxPower ?? 0)
    }
    return result
  }, [maxPower])

  const months = Object.keys(maxByMonth).sort().reverse()

  const reactiveByMonth = useMemo(() => {
    const result: Record<string, number> = {}
    if (!Array.isArray(reactive)) return result
    for (const p of reactive) {
      const month = (p.date ?? '').slice(0, 7).replace(/\//g, '-')
      if (!month) continue
      result[month] = (result[month] ?? 0) + ((p.energyP1 ?? 0) + (p.energyP2 ?? 0) + (p.energyP3 ?? 0))
    }
    return result
  }, [reactive])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando cierres...</span>
      </div>
    )
  }

  if (months.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Database className="mx-auto mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-500">Sin datos de cierres disponibles</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Potencias maximas por mes (kW)</span>
        <span className="text-[11px] text-slate-400">12 ultimos meses</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mes</th>
              {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(p => (
                <th
                  key={p}
                  className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: PERIOD_COLORS[p as keyof typeof PERIOD_COLORS] }}
                >
                  {p}
                </th>
              ))}
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reactiva</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {months.map(month => {
              const pows = maxByMonth[month]
              const react = reactiveByMonth[month]
              const open = expanded === month
              return (
                <>
                  <tr
                    key={month}
                    className="cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(open ? null : month)}
                  >
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{month}</td>
                    {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(p => (
                      <td key={p} className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {pows[p] != null ? pows[p].toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '---'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                      {react != null ? `${react.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kVArh` : '---'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {open
                        ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </td>
                  </tr>
                  {open && (
                    <tr key={`${month}-detail`} className="bg-blue-50/40">
                      <td colSpan={9} className="px-6 py-3">
                        <p className="text-xs text-slate-500">
                          Potencia maxima registrada en {month} por periodo.
                          Los valores corresponden al maximetro de la distribuidora.
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Pagina principal ─────────────────────────────────────────────────────────

type Tab = 'info' | 'contrato' | 'curva' | 'cierres'

export default function SupplyDetailPage() {
  const { cups } = useParams<{ cups: string }>()
  const navigate  = useNavigate()
  const [tab, setTab] = useState<Tab>('info')

  const { data: suppliesData, isLoading: loadingSupplies } = useDatadisSupplies()
  const supply: DatadisSupply | undefined = suppliesData?.response?.find(s => s.cups === cups)

  const { data: contractData, isLoading: loadingContract, isError: errorContract } =
    useDatadisContractual(
      supply ? { cups: supply.cups, distributor: supply.distributor } : null,
    )
  const contract = Array.isArray(contractData) ? contractData[0] : undefined

  const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
    { id: 'info',     label: 'Informacion', icon: Database },
    { id: 'contrato', label: 'Contrato',    icon: FileText },
    { id: 'curva',    label: 'Curva',       icon: TrendingUp },
    { id: 'cierres',  label: 'Cierres',     icon: Calendar },
  ]

  const tariff     = supply?.tariff ?? supply?.['tarifaCode'] as string ?? '---'
  const munic      = supply?.municipality ?? supply?.['municipio'] as string ?? ''
  const prov       = supply?.province     ?? supply?.['provincia']  as string ?? ''
  const distributor = supply?.distributor ?? supply?.['cod_disitribuidora'] as string ?? ''

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/datadis')}
          className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Datadis
        </button>

        {loadingSupplies ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando suministro...</span>
          </div>
        ) : !supply ? (
          <div className="flex items-center gap-2 text-red-500">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Suministro no encontrado: {cups}</span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-mono text-base font-bold text-slate-900">{cups}</h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {tariff !== '---' && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {tariff}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Building2 className="h-3 w-3" />
                      {distributorName(distributor)}
                    </span>
                    {(munic || prov) && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {[munic, prov].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <Wifi className="h-3.5 w-3.5" />
              <span>Datadis activo</span>
            </div>
          </div>
        )}
      </div>

      {!loadingSupplies && supply && (
        <>
          {/* Tabs */}
          <div className="border-b border-slate-200 bg-white px-6">
            <div className="flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
                    tab === id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'info'     && <InfoTab supply={supply} />}
            {tab === 'contrato' && (
              <ContractTab
                isLoading={loadingContract}
                isError={errorContract}
                contract={contract}
              />
            )}
            {tab === 'curva'    && <CurveTab supply={supply} />}
            {tab === 'cierres'  && <CierresTab supply={supply} />}
          </div>
        </>
      )}
    </div>
  )
}
