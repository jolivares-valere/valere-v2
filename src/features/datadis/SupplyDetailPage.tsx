import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowLeft, BarChart2, Building2, Calendar,
  CheckCircle2, ChevronDown, ChevronUp,
  Database, FileText, Info, Loader2, MapPin,
  TrendingUp, Wifi, WifiOff, Zap,
} from 'lucide-react'
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  useDatadisSupplies,
  useDatadisContractual,
  useDatadisConsumption,
  useDatadisMaxPower,
  useDatadisReactive,
  type DatadisSupply,
  type DatadisConsumptionPoint,
} from './api'
import {
  normalizeConsumption,
  normalizeContract,
  normalizeMaxPower,
  normalizeReactive,
  extractProvince,
  extractMunicipio,
  extractTariff,
  type ContractDTO,
} from './normalizers'

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

// Mapa de codigos cortos (lo que devuelve getSupplies) y largos (legacy)
const DISTRIBUIDORAS: Record<string, string> = {
  '1': 'UFD (Gas Natural Fenosa)',
  '2': 'EDISTRIBUCIÓN (Endesa)',
  '3': 'I-DE (Iberdrola)',
  '4': 'UFD Distribución',
  '5': 'VIESGO / E.ON',
  '6': 'EOSA',
  '7': 'Eléctrica de Tentudía',
  '8': 'EREDES',
  // Codigos largos (legacy)
  '0021': 'I-DE (Iberdrola)',
  '0022': 'EDISTRIBUCIÓN (Endesa)',
  '0023': 'UFD (Gas Natural)',
  '0024': 'EDISTRIBUCIÓN (Naturgy)',
  '0031': 'EOSA',
  '0033': 'EREDES',
  '0029': 'UFD Distribución',
  '0026': 'Viesgo / E.ON',
}

// Devuelve nombre legible de distribuidora a partir de código o nombre directo
function distributorLabel(supply: DatadisSupply): string {
  // getSupplies portal devuelve 'distribuidora' con el nombre ya en texto
  const nombre = supply['distribuidora'] as string | undefined
  if (nombre && typeof nombre === 'string' && nombre.length > 2) return nombre
  // Fallback a código
  const code = String(supply['cod_disitribuidora'] ?? supply.distributor ?? '')
  return DISTRIBUIDORAS[code] ?? code
}

const TIPO_PUNTO: Record<number, string> = {
  1: 'Telemedida (Tipo 1)',
  2: 'Telegestión (Tipo 2)',
  3: 'Tipo 3',
  4: 'Tipo 4 (BT sin telemedida)',
  5: 'Tipo 5 (estimado)',
}

function tipoPuntoLabel(supply: DatadisSupply): string {
  const tp = (supply['tipoPunto'] ?? supply.pointType ?? supply['tipoPuntoMedida']) as number | undefined
  if (tp == null) return '---'
  return TIPO_PUNTO[tp] ?? `Tipo ${tp}`
}

// Código numérico del tipo de punto
function tipoPuntoCod(supply: DatadisSupply): number {
  return Number(supply['tipoPunto'] ?? supply.pointType ?? supply['tipoPuntoMedida'] ?? 5)
}

// Código de distribuidora para enviar al proxy
function distributorCode(supply: DatadisSupply): string {
  return String(supply['cod_disitribuidora'] ?? supply.distributor ?? '')
}

function isoToDisplay(date: string) {
  if (!date) return '---'
  return date.replace(/\//g, '-')
}

// Campo seguro del supply con múltiples alias
function sf(supply: DatadisSupply, ...keys: string[]): string {
  for (const k of keys) {
    const v = supply[k]
    if (v != null && v !== '') return String(v)
  }
  return '---'
}

// Obtener rango de fechas
function getDateRange(monthsBack = 1) {
  const now  = new Date()
  const end  = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  const past = new Date(now)
  past.setMonth(past.getMonth() - monthsBack)
  const start = `${past.getFullYear()}/${String(past.getMonth() + 1).padStart(2, '0')}/01`
  return { start, end }
}

// ─── Tab: Información ─────────────────────────────────────────────────────────

function InfoTab({ supply, contract }: { supply: DatadisSupply; contract?: ContractDTO | null }) {
  const [showRaw, setShowRaw] = useState(false)

  // Algunos campos solo vienen en get_contractual (no en get_supplies)
  const tarifa  = sf(supply, 'tarifa', 'tariff', 'tarifaCode') !== '---'
    ? sf(supply, 'tarifa', 'tariff', 'tarifaCode')
    : contract?.tariff ?? '---'
  const tension = sf(supply, 'tension') !== '---'
    ? sf(supply, 'tension')
    : contract?.tension ?? '---'

  const fields: [string, string][] = [
    ['CUPS', supply.cups ?? '---'],
    ['Distribuidor', distributorLabel(supply)],
    ['Tarifa', tarifa],
    ['Tipo de punto', tipoPuntoLabel(supply)],
    ['Municipio', sf(supply, 'municipio', 'descripcionMunicipio', 'municipality')],
    ['Provincia', sf(supply, 'provincia', 'descripcionProvincia', 'province')],
    ['Código postal', sf(supply, 'codigoPostal', 'codPostal', 'postalCode')],
    ['Tensión', tension],
    ['Vigencia desde', isoToDisplay(sf(supply, 'fechaVigenciaDesde', 'validDateFrom'))],
    ['Vigencia hasta', isoToDisplay(sf(supply, 'fechaVigenciaHasta', 'validDateTo'))],
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          Datos del suministro
        </h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {fields.map(([label, val]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className={`mt-0.5 text-xs text-slate-700 ${label === 'CUPS' ? 'font-mono' : ''}`}>
                {val === '---' ? <span className="text-slate-300">---</span> : val}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Campos raw colapsables */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRaw(r => !r)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Info className="h-3.5 w-3.5" />
            Campos raw de Datadis
          </span>
          {showRaw
            ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>
        {showRaw && (
          <div className="border-t border-slate-100 px-4 pb-3 pt-2">
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
        )}
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
  contract: ContractDTO | null | undefined
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
          Verifica que el punto tiene datos contractuales en Datadis y reintenta.
        </p>
      </div>
    )
  }

  // Potencias desde el DTO normalizado (siempre array[6])
  const potencias: [string, number][] = [
    ['P1', contract?.powers[0] ?? 0],
    ['P2', contract?.powers[1] ?? 0],
    ['P3', contract?.powers[2] ?? 0],
    ['P4', contract?.powers[3] ?? 0],
    ['P5', contract?.powers[4] ?? 0],
    ['P6', contract?.powers[5] ?? 0],
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          Datos del contrato
        </h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {([
            ['Tarifa acceso',   contract?.tariff     ?? '---'],
            ['Comercializadora', contract?.marketer   ?? '---'],
            ['Distribuidor',    contract?.distributor ?? '---'],
            ['Tensión',         contract?.tension     ?? '---'],
            ['Inicio contrato', isoToDisplay(contract?.startDate ?? '')],
            ['Fin contrato',    contract?.endDate ? isoToDisplay(contract.endDate) : 'Indefinido'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">
                {val === '---' ? <span className="text-slate-300">---</span> : val}
              </dd>
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
                {kw > 0 ? kw.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : <span className="text-slate-300 text-base">---</span>}
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

  const tipoPunto = tipoPuntoCod(supply)

  // Tipo 3, 4, 5 no tienen curva cuarto-horaria disponible en Datadis
  if (tipoPunto >= 3) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-6 py-12 text-center">
        <Database className="mx-auto mb-3 h-10 w-10 text-amber-200" />
        <p className="text-sm font-semibold text-amber-700">Curva no disponible para este suministro</p>
        <p className="mt-1.5 text-xs text-amber-600 max-w-sm mx-auto">
          Solo los suministros con telemedida (Tipo 1) o telegestión (Tipo 2) tienen curva horaria en Datadis.
          Este punto es <strong>{TIPO_PUNTO[tipoPunto] ?? `Tipo ${tipoPunto}`}</strong>.
        </p>
      </div>
    )
  }

  const monthsBack = range === '7d' ? 0 : range === '30d' ? 1 : 3

  const dates = useMemo(() => {
    const { start, end } = getDateRange(monthsBack)
    return { start, end }
  }, [monthsBack])

  const cups      = supply.cups
  const distCode  = distributorCode(supply)
  const province  = extractProvince(supply)
  const municipio = extractMunicipio(supply)
  const tariff    = sf(supply, 'tarifa', 'tariff', 'tarifaCode')

  const { data, isLoading, isError, error } = useDatadisConsumption(
    cups && distCode ? {
      cups,
      distributor:     distCode,
      fechaInicial:    dates.start,
      fechaFinal:      dates.end,
      provinceCode:    province,
      municipioCode:   municipio,
      tarifaCode:      tariff !== '---' ? tariff : '3.0TD',
      tipoPuntoMedida: tipoPunto,
    } : null,
    creds,
  )

  const chartData = useMemo(() => buildChartData(Array.isArray(data) ? data : []), [data])
  const totalKwh  = chartData.reduce((s, d) => s + d.kwh, 0)
  const maxKwh    = chartData.length ? Math.max(...chartData.map(d => d.kwh)) : 0
  const avgKwh    = chartData.length ? totalKwh / chartData.length : 0

  return (
    <div className="space-y-4">
      {/* Controles de rango */}
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
            {r === '7d' ? '7 días' : r === '30d' ? '30 días' : '3 meses'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['Total', `${totalKwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kWh`],
          ['Máximo día', `${maxKwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kWh`],
          ['Media día', `${avgKwh.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kWh`],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{val}</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {isLoading && (
          <div className="flex h-48 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando curva de consumo...</span>
          </div>
        )}
        {isError && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <WifiOff className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No se pudo cargar la curva de consumo</p>
            {error instanceof Error && (
              <p className="text-xs text-slate-400 max-w-sm">{error.message}</p>
            )}
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
  contract,
  creds,
}: {
  supply: DatadisSupply
  contract?: ContractDTO | null
  creds?: { username: string; password: string }
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const dates    = useMemo(() => getDateRange(12), [])
  const cups     = supply.cups
  const distCode = distributorCode(supply)
  const province = extractProvince(supply)
  const tariff   = extractTariff(supply, contract)

  const { data: maxPower, isLoading: loadingMax, isError: errorMax } = useDatadisMaxPower(
    cups && distCode ? {
      cups,
      distributor:  distCode,
      fechaInicial: dates.start,
      fechaFinal:   dates.end,
      provinceCode: province,
      tarifaCode:   tariff !== '---' ? tariff : '3.0TD',
    } : null,
    creds,
  )

  const { data: reactive, isLoading: loadingReact } = useDatadisReactive(
    cups && distCode ? {
      cups,
      distributor:  distCode,
      fechaInicial: dates.start,
      fechaFinal:   dates.end,
      provinceCode: province,
      tarifaCode:   tariff !== '---' ? tariff : '3.0TD',
    } : null,
    creds,
  )

  const isLoading = loadingMax || loadingReact

  // Normalizar respuestas — toda la lógica de shapes y aliases va en normalizers.ts
  const maxPowerDTOs   = useMemo(() => normalizeMaxPower(maxPower),   [maxPower])
  const reactiveDTOs   = useMemo(() => normalizeReactive(reactive),   [reactive])

  // Agregar por mes/período para la tabla
  const maxByMonth = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    for (const p of maxPowerDTOs) {
      if (!result[p.month]) result[p.month] = {}
      const per = `P${p.period}`
      result[p.month][per] = Math.max(result[p.month][per] ?? 0, p.maxKw)
    }
    return result
  }, [maxPowerDTOs])

  const months = Object.keys(maxByMonth).sort().reverse()

  const reactiveByMonth = useMemo(() => {
    const result: Record<string, number> = {}
    for (const p of reactiveDTOs) {
      result[p.month] = (result[p.month] ?? 0) + p.totalKvarh
    }
    return result
  }, [reactiveDTOs])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando cierres...</span>
      </div>
    )
  }

  if (errorMax) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
        <WifiOff className="mx-auto mb-2 h-8 w-8 text-red-300" />
        <p className="text-sm font-medium text-red-600">No se pudieron cargar los cierres</p>
        <p className="mt-1 text-xs text-red-400">Reintenta o comprueba que el punto tiene datos históricos en Datadis.</p>
      </div>
    )
  }

  if (months.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Database className="mx-auto mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-500">Sin datos de cierres disponibles</p>
        <p className="mt-1 text-xs text-slate-400">
          Datadis devolvió una respuesta vacía para los últimos 12 meses.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Potencias máximas por mes (kW)</span>
        <span className="text-[11px] text-slate-400">Últimos 12 meses</span>
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
                        {pows[p] != null ? pows[p].toLocaleString('es-ES', { maximumFractionDigits: 1 }) : <span className="text-slate-300">---</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                      {react != null ? `${react.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kVArh` : <span className="text-slate-300">---</span>}
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
                          Potencia máxima registrada en {month} por periodo tarifario.
                          Los valores corresponden al maxímetro de la distribuidora.
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

// ─── Tab: Reactiva ────────────────────────────────────────────────────────────

const PERIOD_COLORS_REACT = ['#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#6b7280']

function reactivaBadge(totalKvarh: number): { label: string; color: string; icon: typeof CheckCircle2 } {
  const abs = Math.abs(totalKvarh)
  if (abs < 10)  return { label: 'Normal',              color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 }
  if (abs < 150) return { label: 'Revisar',             color: 'text-amber-600   bg-amber-50   border-amber-200',   icon: AlertTriangle }
  return              { label: 'Posible penalización', color: 'text-red-600     bg-red-50     border-red-200',     icon: AlertTriangle }
}

function ReactivaTab({
  supply,
  contract,
}: {
  supply: DatadisSupply
  contract?: ContractDTO | null
}) {
  const dates     = useMemo(() => getDateRange(13), [])
  const cups      = supply.cups
  const distCode  = distributorCode(supply)
  const province  = extractProvince(supply)
  const tariff    = extractTariff(supply, contract)

  const { data: reactive, isLoading, isError } = useDatadisReactive(
    cups && distCode ? {
      cups,
      distributor:  distCode,
      fechaInicial: dates.start,
      fechaFinal:   dates.end,
      provinceCode: province,
      tarifaCode:   tariff,
    } : null,
  )

  const dtos = useMemo(() => normalizeReactive(reactive), [reactive])

  // KPIs resumen
  const totalAbsKvarh = dtos.reduce((s, d) => s + Math.abs(d.totalKvarh), 0)
  const mesesConReact = dtos.filter(d => Math.abs(d.totalKvarh) > 1).length
  const maxMes = dtos.length > 0
    ? dtos.reduce((max, d) => Math.abs(d.totalKvarh) > Math.abs(max.totalKvarh) ? d : max, dtos[0])
    : null

  // Datos para el gráfico de barras mensual
  const chartData = [...dtos]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({
      mes:     d.month.slice(5),           // MM
      month:   d.month,
      kvarh:   Math.round(Math.abs(d.totalKvarh) * 10) / 10,
      signo:   d.totalKvarh < 0 ? 'C' : 'I', // capacitiva / inductiva
    }))

  const badge = reactivaBadge(totalAbsKvarh)
  const BadgeIcon = badge.icon

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando energía reactiva...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
        <WifiOff className="mx-auto mb-2 h-8 w-8 text-red-300" />
        <p className="text-sm font-medium text-red-600">No se pudo cargar la energía reactiva</p>
        <p className="mt-1 text-xs text-red-400">Reintenta o comprueba que el punto tiene datos en Datadis.</p>
      </div>
    )
  }

  if (dtos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Activity className="mx-auto mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-500">Sin datos de energía reactiva</p>
        <p className="mt-1 text-xs text-slate-400">
          Solo disponible en suministros con tarifa 3.0TD o 6.1TD (normalmente {'>'}15 kW).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Badge de estado */}
      <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${badge.color}`}>
        <BadgeIcon className="h-4 w-4 shrink-0" />
        <div>
          <span className="text-sm font-semibold">{badge.label}</span>
          <span className="ml-2 text-xs opacity-75">
            {badge.label === 'Normal'
              ? 'Reactiva dentro de márgenes habituales.'
              : badge.label === 'Revisar'
              ? 'Revisar si hay penalización en la última factura.'
              : 'Reactiva superior a 150 kVArh. Probable cargo en factura — considerar batería de condensadores.'}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['Total período', `${Math.round(totalAbsKvarh).toLocaleString('es-ES')} kVArh`],
          ['Meses con reactiva', `${mesesConReact} / ${dtos.length}`],
          ['Mes máximo', maxMes ? `${Math.abs(maxMes.totalKvarh).toLocaleString('es-ES', { maximumFractionDigits: 0 })} kVArh` : '---'],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{val}</p>
          </div>
        ))}
      </div>

      {/* Gráfico mensual */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
          kVArh totales por mes (valor absoluto)
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" kVArh" width={72} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value: unknown) => [
                `${Number(value || 0).toFixed(1)} kVArh`,
                'Reactiva',
              ]}
            />
            <Bar dataKey="kvarh" radius={[4, 4, 0, 0]}>
              {chartData.map(entry => (
                <Cell
                  key={entry.month}
                  fill={
                    entry.kvarh < 10 ? '#22c55e'
                    : entry.kvarh < 150 ? '#f59e0b'
                    : '#ef4444'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla mensual P1–P6 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {['Mes', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'Total', 'Estado'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...dtos].sort((a, b) => b.month.localeCompare(a.month)).map(d => {
              const rb = reactivaBadge(d.totalKvarh)
              return (
                <tr key={d.month} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-700">{d.month}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{d.energyP1.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{d.energyP2.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{d.energyP3.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{d.energyP4.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{d.energyP5.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{d.energyP6.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700">{Math.abs(d.totalKvarh).toFixed(1)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${rb.color}`}>
                      {rb.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Nota */}
      <p className="text-[11px] text-slate-400">
        * Penalización por reactiva cuando cosθ {'<'} 0,95. Umbral 150 kVArh orientativo.
      </p>
    </div>
  )
}

// ─── Tab: Consumo ────────────────────────────────────────────────────────────────────────────

type ConsumoRange = '3m' | '6m' | '12m' | '24m'

const PERIOD_FILL = {
  P1: '#ef4444', P2: '#f97316', P3: '#3b82f6',
  P4: '#8b5cf6', P5: '#10b981', P6: '#6b7280',
} as const

const SOURCE_BADGE: Record<'Real' | 'Estimada' | 'Mixto', { label: string; cls: string }> = {
  Real:     { label: 'Real',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Estimada: { label: 'Estimada', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Mixto:    { label: 'Mixto',    cls: 'bg-slate-50 text-slate-600 border-slate-200' },
}

function ConsumoTab({ supply, contract }: { supply: DatadisSupply; contract?: ContractDTO | null }) {
  const [range, setRange] = useState<ConsumoRange>('12m')

  const monthsBack = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 24

  const { start, end } = useMemo(() => {
    const now  = new Date()
    const from = new Date(now)
    from.setMonth(from.getMonth() - monthsBack)
    const fmt = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    return { start: fmt(from), end: fmt(now) }
  }, [monthsBack])

  const cups      = supply.cups
  const distCode  = distributorCode(supply)
  const province  = extractProvince(supply)
  const municipio = extractMunicipio(supply)
  const tipoPunto = tipoPuntoCod(supply)
  const tariff    = extractTariff(supply, contract)

  const { data, isLoading, isError, error } = useDatadisConsumption(
    cups && distCode ? {
      cups,
      distributor:     distCode,
      fechaInicial:    start,
      fechaFinal:      end,
      provinceCode:    province,
      municipioCode:   municipio,
      tarifaCode:      tariff !== '---' ? tariff : '3.0TD',
      tipoPuntoMedida: tipoPunto,
    } : null,
  )

  const normalized = useMemo(
    () => normalizeConsumption(data, { tariff: tariff !== '---' ? tariff : '3.0TD' }),
    [data, tariff],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando consumo...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
        <WifiOff className="mx-auto mb-2 h-8 w-8 text-red-300" />
        <p className="text-sm font-medium text-red-600">No se pudo cargar el consumo</p>
        {error instanceof Error && (
          <p className="mt-1 text-xs text-red-400">{error.message}</p>
        )}
      </div>
    )
  }

  if (!normalized || normalized.monthsCovered === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Database className="mx-auto mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-500">Sin datos de consumo para el período seleccionado</p>
        <p className="mt-1 text-xs text-slate-400">
          El suministro puede no tener curva horaria disponible en Datadis.
        </p>
      </div>
    )
  }

  const { monthly, totalKwh, dominantPeriod, maxHourKwh, maxHourDate, periodConfidence } = normalized
  const avgKwh = monthly.length ? totalKwh / monthly.length : 0

  return (
    <div className="space-y-4">
      {/* Selector de rango */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['3m', '6m', '12m', '24m'] as ConsumoRange[]).map(r => (
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
              {r === '3m' ? '3 meses' : r === '6m' ? '6 meses' : r === '12m' ? '12 meses' : '24 meses'}
            </button>
          ))}
        </div>
        {periodConfidence === 'estimated' && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Períodos estimados
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ['Total período',   `${Math.round(totalKwh).toLocaleString('es-ES')} kWh`],
          ['Media mensual',    `${Math.round(avgKwh).toLocaleString('es-ES')} kWh`],
          ['Máx. hora',       `${maxHourKwh.toFixed(3)} kWh`],
          ['Período dominante', dominantPeriod ?? '---'],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{val}</p>
          </div>
        ))}
      </div>

      {/* Gráfico barras apiladas P1–P6 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
          Consumo mensual por período (kWh)
        </h3>
        <p className="mb-4 text-[10px] text-amber-600">
          Desglose P1–P6 estimado a partir de hora y día de la semana (sin festivos).
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => String(v).slice(5)}
            />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" kWh" width={68} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value: unknown, name: unknown) => [
                `${Number(value || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })} kWh`,
                String(name),
              ]}
            />
            {(['P1','P2','P3','P4','P5','P6'] as const).map((p, i) => (
              <Bar
                key={p}
                dataKey={`byPeriod.${p}`}
                name={p}
                stackId="a"
                fill={PERIOD_FILL[p]}
                radius={i === 5 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {/* Leyenda */}
        <div className="mt-3 flex flex-wrap gap-3 justify-end">
          {(['P1','P2','P3','P4','P5','P6'] as const).map(p => (
            <span key={p} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: PERIOD_FILL[p] }} />
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Tabla mensual */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Mes</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">P1</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">P2</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">P3</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">P4</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">P5</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">P6</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-400">Total</th>
              <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide text-slate-400">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {[...monthly].reverse().map(m => {
              const sb = SOURCE_BADGE[m.source]
              return (
                <tr key={m.month} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-700">{m.month}</td>
                  {(['P1','P2','P3','P4','P5','P6'] as const).map(p => (
                    <td key={p} className="px-3 py-2 text-right text-slate-600">
                      {m.byPeriod[p] > 0
                        ? m.byPeriod[p].toLocaleString('es-ES', { maximumFractionDigits: 0 })
                        : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">
                    {m.totalKwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sb.cls}`}>
                      {sb.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Nota legal */}
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-[11px] text-amber-700">
          <strong>Períodos estimados:</strong> la asignación P1–P6 se deriva de hora y día de la semana
          según la matriz 3.0TD oficial, sin incluir festivos nacionales ni autonómicos.
          Error estimado: {'<'}2%. Para facturación exacta se incorporará el calendario
          oficial en la próxima versión.
        </p>
      </div>
    </div>
  )
}

type Tab = 'info' | 'contrato' | 'curva' | 'cierres' | 'reactiva' | 'consumo'

export default function SupplyDetailPage() {
  const { cups } = useParams<{ cups: string }>()
  const navigate  = useNavigate()
  const [tab, setTab] = useState<Tab>('info')

  const { data: suppliesData, isLoading: loadingSupplies } = useDatadisSupplies()
  const supply: DatadisSupply | undefined = suppliesData?.response?.find(s => s.cups === cups)

  const distCode = supply ? distributorCode(supply) : undefined

  const { data: contractData, isLoading: loadingContract, isError: errorContract } =
    useDatadisContractual(
      supply && distCode ? { cups: supply.cups, distributor: distCode } : null,
    )

  const contract: ContractDTO | null = useMemo(
    () => normalizeContract(contractData),
    [contractData],
  )

  const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
    { id: 'info',     label: 'Información', icon: Database },
    { id: 'contrato', label: 'Contrato',    icon: FileText },
    { id: 'curva',    label: 'Curva',       icon: TrendingUp },
    { id: 'cierres',  label: 'Cierres',     icon: Calendar },
    { id: 'reactiva', label: 'Reactiva',    icon: Activity },
    { id: 'consumo',  label: 'Consumo',     icon: BarChart2 },
  ]

  const tariff = supply ? sf(supply, 'tarifa', 'tariff', 'tarifaCode') : ''
  const munic  = supply ? sf(supply, 'municipio', 'municipality') : ''
  const prov   = supply ? sf(supply, 'provincia', 'province') : ''

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
          Volver al listado de suministros
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
                    {tariff !== '---' && tariff && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {tariff}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Building2 className="h-3 w-3" />
                      {distributorLabel(supply)}
                    </span>
                    {(munic !== '---' || prov !== '---') && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {[munic, prov].filter(v => v && v !== '---').join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <Wifi className="h-3.5 w-3.5" />
              <span>Sincronizado con Datadis</span>
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
            {tab === 'info'     && <InfoTab supply={supply} contract={contract} />}
            {tab === 'contrato' && (
              <ContractTab
                isLoading={loadingContract}
                isError={errorContract}
                contract={contract}
              />
            )}
            {tab === 'curva'    && <CurveTab supply={supply} />}
            {tab === 'cierres'  && <CierresTab supply={supply} contract={contract} />}
            {tab === 'reactiva' && <ReactivaTab supply={supply} />}
            {tab === 'consumo'  && <ConsumoTab supply={supply} contract={contract} />}
          </div>
        </>
      )}
    </div>
  )
}
