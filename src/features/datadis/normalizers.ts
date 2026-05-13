/**
 * normalizers.ts — Capa de normalización Datadis
 *
 * Propósito: convertir los payloads heterogéneos de Datadis (campos en español,
 * campos en inglés, response envuelto en {response:[...]}, etc.) a DTOs canónicos
 * tipados que el frontend puede consumir sin alias ni guards defensivos.
 *
 * Distribuidoras cubiertas: EDISTRIBUCIÓN, i-DE, UFD, Viesgo, Naturgy.
 * Si aparece una nueva distribuidora con otro shape, la fix va AQUÍ, no en el componente.
 */

import type { DatadisSupply, DatadisContractualData, DatadisMaxPowerPoint, DatadisReactivePoint } from './api'

// ─── DTOs canónicos ────────────────────────────────────────────────────────────

export interface ContractDTO {
  /** Tarifa de acceso normalizada: "2.0TD" | "3.0TD" | "6.1TD" | null */
  tariff: string | null
  /** Nombre de la comercializadora */
  marketer: string | null
  /** Nombre de la distribuidora */
  distributor: string | null
  /** Tensión de conexión: "1" = BT, "2" = MT */
  tension: string | null
  /** Fecha de inicio del contrato (YYYY-MM-DD o YYYY/MM/DD) */
  startDate: string | null
  /** Fecha de fin del contrato — null si es indefinido (9999/01/01) */
  endDate: string | null
  /** Potencias contratadas P1..P6 en kW. Siempre array[6]; 0 si no existe el período */
  powers: [number, number, number, number, number, number]
}

export interface MaxPowerDTO {
  /** Mes en formato YYYY-MM */
  month: string
  /** Período tarifario: 1..6 */
  period: number
  /** Potencia máxima demandada en kW */
  maxKw: number
}

export interface ReactiveDTO {
  /** Mes en formato YYYY-MM */
  month: string
  energyP1: number
  energyP2: number
  energyP3: number
  energyP4: number
  energyP5: number
  energyP6: number
  /** Suma absoluta de todos los períodos en kVArh */
  totalKvarh: number
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

/** Convierte "YYYY/MM/DD..." o "YYYY-MM-DD..." a "YYYY-MM". Devuelve "" si no es válido. */
function toYearMonth(raw: unknown): string {
  if (!raw) return ''
  const s = String(raw).replace(/\//g, '-')
  const m = s.slice(0, 7)
  // Validar mínimo formato YYYY-MM
  return /^\d{4}-\d{2}/.test(m) ? m : ''
}

/** Extrae un array de la respuesta, que puede venir en varias formas. */
function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  const r = raw as Record<string, unknown> | null | undefined
  if (r && Array.isArray(r.response)) return r.response as unknown[]
  return []
}

// ─── normalizeContract ─────────────────────────────────────────────────────────

/**
 * Normaliza la respuesta de get_contractual.
 * Soporta: [{...}], {response:[{...}]} y el item directo.
 *
 * EDISTRIBUCIÓN (campos en español):
 *   tarifaAcceso, comercializador, fechaInicio, fechaFin, potenciaContratada[], tension
 *
 * Otros portales (campos en inglés):
 *   accessFare, marketer, startDate, endDate, contractedPowerkWP1..6
 */
export function normalizeContract(raw: unknown): ContractDTO | null {
  if (!raw) return null

  // Extraer el primer elemento del array (puede estar envuelto en {response:[...]})
  const arr = extractArray(raw)
  const item = arr.length > 0
    ? arr[0] as DatadisContractualData
    : (raw as DatadisContractualData)

  if (!item || typeof item !== 'object') return null

  // Potencias: EDISTRIBUCIÓN devuelve array 'potenciaContratada'; otros devuelven campos P1..P6
  const potArr = item['potenciaContratada'] as number[] | undefined
  const powers: [number, number, number, number, number, number] = [
    potArr?.[0] ?? item.contractedPowerkWP1 ?? 0,
    potArr?.[1] ?? item.contractedPowerkWP2 ?? 0,
    potArr?.[2] ?? item.contractedPowerkWP3 ?? 0,
    potArr?.[3] ?? item.contractedPowerkWP4 ?? 0,
    potArr?.[4] ?? item.contractedPowerkWP5 ?? 0,
    potArr?.[5] ?? item.contractedPowerkWP6 ?? 0,
  ]

  // Fecha fin: 9999/01/01 = indefinido → null
  const rawEnd = String(item['fechaFin'] ?? item.endDate ?? '')
  const endDate = rawEnd.startsWith('9999') ? null : rawEnd || null

  return {
    tariff:      String(item['tarifaAcceso'] ?? item['tarifaAccesoCode'] ?? item.accessFare ?? '') || null,
    marketer:    String(item['comercializador'] ?? item.marketer ?? '') || null,
    distributor: String(item['distribuidor'] ?? item.distributor ?? '') || null,
    tension:     String(item['tension'] ?? item.tension ?? '') || null,
    startDate:   String(item['fechaInicio'] ?? item.startDate ?? '') || null,
    endDate,
    powers,
  }
}

// ─── normalizeMaxPower ─────────────────────────────────────────────────────────

/**
 * Normaliza la respuesta de get_max_power.
 * Soporta: [...] y {response:[...]}.
 *
 * EDISTRIBUCIÓN (campos en español):
 *   fechaMaximo, periodo, maximoPotenciaDemandada
 *
 * Otros portales (campos en inglés):
 *   date, period, maxPower
 */
export function normalizeMaxPower(raw: unknown): MaxPowerDTO[] {
  const arr = extractArray(raw)
  const result: MaxPowerDTO[] = []

  for (const p of arr) {
    const item = p as DatadisMaxPowerPoint
    const month = toYearMonth(item['fechaMaximo'] ?? item.date)
    if (!month) continue

    const period = Number(item['periodo'] ?? item.period ?? 1)
    const maxKw  = Number(item['maximoPotenciaDemandada'] ?? item.maxPower ?? 0)

    result.push({ month, period, maxKw })
  }

  return result
}

// ─── normalizeReactive ─────────────────────────────────────────────────────────

/**
 * Normaliza la respuesta de get_reactive.
 * Soporta:
 *   - [...] array directo
 *   - {response: [...]}
 *   - {response: {code, cups, energy: [...]}}  ← formato EDISTRIBUCIÓN
 *
 * Los valores pueden ser negativos (energía capacitiva) — se conservan tal cual.
 */
export function normalizeReactive(raw: unknown): ReactiveDTO[] {
  if (!raw) return []

  // EDISTRIBUCIÓN: {response: {energy: [...]}}
  const r = raw as Record<string, unknown>
  const inner = r?.response as Record<string, unknown> | undefined
  const arr: unknown[] = Array.isArray(raw) ? raw
    : Array.isArray(r?.response) ? r.response as unknown[]
    : Array.isArray(inner?.energy) ? inner.energy as unknown[]
    : []

  const result: ReactiveDTO[] = []

  for (const p of arr) {
    const item = p as DatadisReactivePoint
    const month = toYearMonth(item.date)
    if (!month) continue

    const e1 = Number(item.energyP1 ?? 0)
    const e2 = Number(item.energyP2 ?? 0)
    const e3 = Number(item.energyP3 ?? 0)
    const e4 = Number(item.energyP4 ?? 0)
    const e5 = Number(item.energyP5 ?? 0)
    const e6 = Number(item.energyP6 ?? 0)

    result.push({
      month,
      energyP1: e1,
      energyP2: e2,
      energyP3: e3,
      energyP4: e4,
      energyP5: e5,
      energyP6: e6,
      totalKvarh: e1 + e2 + e3 + e4 + e5 + e6,
    })
  }

  return result
}

// ─── Helpers de extracción de supply ──────────────────────────────────────────

/**
 * Extrae el código de provincia del supply.
 * EDISTRIBUCIÓN: 'codigoProvincia' | otros: 'codProvincia' | 'cod_provincia'
 * Fallback: '41' (Sevilla, donde opera Valere por defecto).
 */
export function extractProvince(supply: DatadisSupply): string {
  const v = supply['codigoProvincia'] ?? supply['codProvincia'] ?? supply['cod_provincia']
  return v != null && String(v) !== '' ? String(v) : '41'
}

/**
 * Extrae el código de municipio del supply.
 * Fallback: '041091' (Sevilla capital).
 */
export function extractMunicipio(supply: DatadisSupply): string {
  const v = supply['codMunicipio'] ?? supply['cod_municipio'] ?? supply['municipioCode']
  return v != null && String(v) !== '' ? String(v) : '041091'
}

/**
 * Extrae la tarifa del supply; si no viene, intenta del contrato normalizado.
 * Fallback: '3.0TD'.
 */
export function extractTariff(supply: DatadisSupply, contract?: ContractDTO | null): string {
  for (const k of ['tarifa', 'tariff', 'tarifaCode'] as (keyof DatadisSupply)[]) {
    const v = supply[k]
    if (v != null && String(v) !== '' && String(v) !== '---') return String(v)
  }
  return contract?.tariff ?? '3.0TD'
}

import { derivePeriod } from './periodos30TD'
import type { TariffPeriod } from './periodos30TD'

// ─── ConsumoMonthlyAgg + ConsumoNormalized ──────────────────────────────────────────────────────────

/** Agregado mensual con desglose de períodos estimados */
export interface ConsumoMonthlyAgg {
  month: string
  totalKwh: number
  byPeriod: Record<TariffPeriod, number>
  maxHourKwh: number
  /** Calidad del dato en el mes */
  source: 'Real' | 'Estimada' | 'Mixto'
  pointCount: number
}

/** Resultado completo de normalización de consumo horario */
export interface ConsumoNormalized {
  cups: string
  monthly: ConsumoMonthlyAgg[]
  totalKwh: number
  monthsCovered: number
  hasRealData: boolean
  hasEstimatedData: boolean
  rangeStart: string
  rangeEnd: string
  /** Máximo kWh en una sola hora */
  maxHourKwh: number
  maxHourDate: string
  /** Período con más kWh acumulados en todo el rango */
  dominantPeriod: TariffPeriod | null
  /** 'estimated': derivado de hora/día/mes sin festivos (v1) */
  periodConfidence: 'estimated'
}

/**
 * Normaliza la respuesta de get_consumption (curva horaria).
 *
 * Shape real de EDISTRIBUCIÓN:
 *   raw = { response: { timeCurveList: [...], mediumCurveList: null, ... } }
 *
 * Cada punto:
 *   { cups, date, hour, measureMagnitudeActive, metodoObtencion, ... }
 *
 * @param raw   - Dato crudo del proxy (data.data)
 * @param opts  - { tariff: código de tarifa del contrato, default "3.0TD" }
 */
export function normalizeConsumption(
  raw: unknown,
  opts: { tariff?: string } = {},
): ConsumoNormalized | null {
  if (!raw) return null

  const r    = raw as Record<string, unknown>
  const resp = r?.response as Record<string, unknown> | null | undefined

  // Extraer timeCurveList
  const list: unknown[] = Array.isArray(resp?.timeCurveList)
    ? (resp!.timeCurveList as unknown[])
    : []

  if (!list.length) return null

  const tariff = opts.tariff ?? '3.0TD'

  const byMonth: Record<string, ConsumoMonthlyAgg> = {}
  const periodTotals: Record<TariffPeriod, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 }

  let cups        = ''
  let totalKwh    = 0
  let maxHourKwh  = 0
  let maxHourDate = ''
  let hasReal     = false
  let hasEstimated = false

  for (const p of list) {
    const item = p as Record<string, unknown>

    const rawDate = String(item['date'] ?? '')
    const hour    = String(item['hour'] ?? item['time'] ?? '01:00')
    const kwh     = Math.max(0, Number(item['measureMagnitudeActive'] ?? item['consumptionKWh'] ?? 0))
    const srcRaw  = String(item['metodoObtencion'] ?? item['obtainMethod'] ?? 'Real')
    const isReal  = srcRaw === 'Real' || srcRaw === '1'

    const month = toYearMonth(rawDate)
    if (!month) continue

    cups      = String(item['cups'] ?? cups)
    totalKwh += kwh

    if (kwh > maxHourKwh) {
      maxHourKwh  = kwh
      maxHourDate = rawDate.replace(/\//g, '-') + ' ' + hour
    }

    if (isReal) hasReal = true
    else        hasEstimated = true

    const { period } = derivePeriod(rawDate, hour, tariff)
    periodTotals[period] = (periodTotals[period] ?? 0) + kwh

    if (!byMonth[month]) {
      byMonth[month] = {
        month,
        totalKwh:   0,
        byPeriod:   { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 },
        maxHourKwh: 0,
        source:     'Real',
        pointCount: 0,
      }
    }
    const agg = byMonth[month]
    agg.totalKwh        += kwh
    agg.byPeriod[period] = (agg.byPeriod[period] ?? 0) + kwh
    agg.pointCount      += 1
    if (kwh > agg.maxHourKwh) agg.maxHourKwh = kwh

    // Actualizar fuente del mes
    if (agg.source === 'Real'    && !isReal) agg.source = 'Mixto'
    if (agg.source === 'Estimada' && isReal) agg.source = 'Mixto'
    if (agg.source === 'Real'    && !isReal && agg.pointCount === 1) agg.source = 'Estimada'
  }

  const monthly = Object.values(byMonth)
    .map(m => ({
      ...m,
      totalKwh:   Math.round(m.totalKwh   * 10) / 10,
      maxHourKwh: Math.round(m.maxHourKwh * 1000) / 1000,
      byPeriod:   Object.fromEntries(
        Object.entries(m.byPeriod).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ) as ConsumoMonthlyAgg['byPeriod'],
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const sorted   = Object.entries(periodTotals).sort(([, a], [, b]) => b - a)
  const dominant = sorted[0]?.[0] as TariffPeriod | undefined

  const allMonths = monthly.map(m => m.month)

  return {
    cups,
    monthly,
    totalKwh:         Math.round(totalKwh * 10) / 10,
    monthsCovered:    monthly.length,
    hasRealData:      hasReal,
    hasEstimatedData: hasEstimated,
    rangeStart:       allMonths[0]  ?? '',
    rangeEnd:         allMonths[allMonths.length - 1] ?? '',
    maxHourKwh:       Math.round(maxHourKwh * 1000) / 1000,
    maxHourDate,
    dominantPeriod:   dominant ?? null,
    periodConfidence: 'estimated',
  }
}
