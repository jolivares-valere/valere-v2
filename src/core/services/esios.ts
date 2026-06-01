/**
 * esios.ts — Cliente para la API de ESIOS (REE — Red Eléctrica de España)
 *
 * Documentación oficial: https://api.esios.ree.es/
 * Solicitar token personal: consultasios@ree.es
 *
 * IMPORTANTE DE SEGURIDAD:
 *   - El token NUNCA se usa desde el frontend en producción.
 *   - En producción, las llamadas van exclusivamente desde la
 *     Edge Function `esios-price-cache` (variable ESIOS_API_KEY).
 *   - Este módulo es útil para scripts de backfill y tests locales.
 *   - Para leer datos en el frontend, consultar la tabla
 *     `precios_pool_horarios` de Supabase (ya cacheada por el cron).
 *
 * Flujo de datos:
 *   ESIOS API → Edge Function esios-price-cache (nightly)
 *             → Supabase tabla precios_pool_horarios
 *             → Frontend / calculator.ts
 */

// ─── Constantes ────────────────────────────────────────────────────────────

const ESIOS_BASE = 'https://api.esios.ree.es'

/** IDs de indicadores ESIOS relevantes para Valere */
export const ESIOS_INDICATORS = {
  /** Precio mercado spot diario OMIE — €/MWh */
  PRECIO_SPOT:           600,
  /** PVPC término de energía 2.0TD — €/kWh */
  PVPC_ENERGIA_2TD:     1001,
  /** PVPC precio total 2.0TD (energía + peajes + cargos) — €/kWh */
  PVPC_TOTAL_2TD:      10211,
  /** Precio de compensación de excedentes FV (simplificada) — €/kWh */
  COMPENSACION_FV:      1739,
  /** Factor de emisiones CO₂ del sistema eléctrico — gCO₂/kWh */
  FACTOR_CO2:          10349,
  // ── Servicios de ajuste (clientes 3.0TD/6.xTD) ──
  /** Regulación secundaria — banda — €/MW·h */
  REG_SECUNDARIA:        634,
  /** Regulación terciaria — subir — €/MWh */
  REG_TERCIARIA_UP:      686,
  /** Regulación terciaria — bajar — €/MWh */
  REG_TERCIARIA_DOWN:    687,
} as const

export type EsiosIndicatorId = typeof ESIOS_INDICATORS[keyof typeof ESIOS_INDICATORS]

/** Unidades por indicador */
export const ESIOS_UNITS: Record<number, string> = {
  [ESIOS_INDICATORS.PRECIO_SPOT]:       'EUR_MWh',
  [ESIOS_INDICATORS.PVPC_ENERGIA_2TD]:  'EUR_kWh',
  [ESIOS_INDICATORS.PVPC_TOTAL_2TD]:    'EUR_kWh',
  [ESIOS_INDICATORS.COMPENSACION_FV]:   'EUR_kWh',
  [ESIOS_INDICATORS.FACTOR_CO2]:        'gCO2_kWh',
  [ESIOS_INDICATORS.REG_SECUNDARIA]:    'EUR_MWh',
  [ESIOS_INDICATORS.REG_TERCIARIA_UP]:  'EUR_MWh',
  [ESIOS_INDICATORS.REG_TERCIARIA_DOWN]:'EUR_MWh',
}

/** geo_id=3 → Península Ibérica (el sistema peninsular español) */
export const GEO_PENINSULA = 3

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface EsiosValue {
  /** Valor en la unidad propia del indicador */
  value: number
  /** Hora local española (con DST) — ISO8601 */
  datetime: string
  /** Hora UTC — ISO8601. Usar este para almacenar y cruzar con Datadis */
  datetime_utc: string
  geo_id: number
  geo_name: string
}

export interface EsiosIndicatorMeta {
  id: number
  name: string
  short_name?: string
}

export interface EsiosFetchOptions {
  /** Inicio del rango — ISO8601 UTC, p.ej. '2026-05-01T00:00:00Z' */
  startDate: string
  /** Fin del rango — ISO8601 UTC, p.ej. '2026-05-31T23:59:59Z' */
  endDate: string
  /** Granularidad temporal. Default: 'hour' */
  timeTrunc?: 'hour' | 'day' | 'month' | 'year'
  /** Agregación temporal. Default: 'average' */
  timeAgg?: 'average' | 'sum'
  /** Zona geográfica. Default: GEO_PENINSULA (3) */
  geoId?: number
  /** Token de la API ESIOS. Solo para uso en scripts/Edge Functions */
  apiKey: string
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

/**
 * Descarga los valores de un indicador ESIOS para un rango de fechas.
 *
 * Solo usar desde Edge Functions o scripts de backfill.
 * El frontend debe leer de la tabla `precios_pool_horarios` en Supabase.
 */
export async function fetchEsiosIndicator(
  indicatorId: number,
  options: EsiosFetchOptions
): Promise<EsiosValue[]> {
  const {
    startDate,
    endDate,
    timeTrunc = 'hour',
    timeAgg = 'average',
    geoId = GEO_PENINSULA,
    apiKey,
  } = options

  const params = new URLSearchParams({
    start_date: startDate,
    end_date:   endDate,
    time_trunc: timeTrunc,
    time_agg:   timeAgg,
    geo_ids:    String(geoId),
  })

  const url = `${ESIOS_BASE}/indicators/${indicatorId}?${params}`

  const res = await fetch(url, {
    headers: {
      'Accept':       'application/json; application/vnd.esios-api-v1+json',
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `ESIOS API error — indicador ${indicatorId}: HTTP ${res.status} — ${body.slice(0, 300)}`
    )
  }

  const data = await res.json() as {
    indicator: EsiosIndicatorMeta & { values: EsiosValue[] }
  }

  // Filtrar solo el geo_id solicitado (la API puede devolver varios)
  return (data.indicator?.values ?? []).filter(v => v.geo_id === geoId)
}

// ─── Utilidades de conversión ─────────────────────────────────────────────────

/**
 * Convierte precio spot de €/MWh a €/kWh.
 * El indicador 600 (OMIE) devuelve €/MWh. El motor de cálculo trabaja en €/kWh.
 */
export function mwhToKwh(precioEurMwh: number): number {
  return precioEurMwh / 1000
}

/**
 * Dado un array de valores horarios ESIOS y un mapa de consumos horarios,
 * calcula el coste total energético para el periodo.
 *
 * @param consumosHorarios  Array de {hora_utc, kwh} de Datadis
 * @param preciosHorarios   Array de EsiosValue del indicador de precio energía
 * @param spreadEurKwh      Margen de la comercializadora sobre el precio pool
 * @param unidad            'EUR_MWh' (convierte automáticamente) | 'EUR_kWh'
 */
export function calcularCosteIndexado(
  consumosHorarios: Array<{ hora_utc: string; kwh: number }>,
  preciosHorarios: EsiosValue[],
  spreadEurKwh: number,
  unidad: 'EUR_MWh' | 'EUR_kWh' = 'EUR_MWh'
): { costeTotal: number; horasSinPrecio: number } {
  const precioMap = new Map<string, number>()
  for (const p of preciosHorarios) {
    // Normalizar a UTC truncando a la hora exacta (ESIOS puede incluir segundos)
    const horaKey = p.datetime_utc.slice(0, 13) + ':00:00Z'
    const valor = unidad === 'EUR_MWh' ? mwhToKwh(p.value) : p.value
    precioMap.set(horaKey, valor)
  }

  let costeTotal = 0
  let horasSinPrecio = 0

  for (const c of consumosHorarios) {
    const horaKey = c.hora_utc.slice(0, 13) + ':00:00Z'
    const precio = precioMap.get(horaKey)
    if (precio === undefined) {
      horasSinPrecio++
      continue
    }
    costeTotal += c.kwh * (precio + spreadEurKwh)
  }

  return { costeTotal, horasSinPrecio }
}
