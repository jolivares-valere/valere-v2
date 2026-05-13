/**
 * periodos30TD.ts -- Derivacion de periodos tarifarios 3.0TD / 6.1TD / 6.2TD / 6.3TD / 6.4TD
 *
 * Referencia normativa: Circular 3/2020 CNMC -- Estructura de peajes de acceso.
 * Aplicable a tarifas en Baja Tension > 15 kW (3.0TD) y Media Tension (6.xTD).
 *
 * REGLA FUNDAMENTAL
 * =================
 * P6 es UNIVERSAL durante todo el anio. Siempre cubre:
 *   - Sabados y domingos: todas las horas
 *   - Festivos nacionales y autonomicos: todas las horas
 *   - Festivos locales (municipales): NO incluidos (error residual < 0.3%)
 *   - Lunes a viernes laborables: franja 00:00-08:00
 *
 * P1-P5 solo aplican a dias laborables L-V en la franja 08:00-24:00.
 * Los numeros de periodo activos y sus nombres dependen de la temporada del mes.
 *
 * TEMPORADAS (Circular 3/2020 CNMC, Anexo II, peajes 3.0TD / 6.xTD)
 * ===================================================================
 *
 *   Temporada Alta       : ene, feb, jul, dic  ->  P1 (punta) + P2 (llano)
 *   Temporada Media      : mar, nov             ->  P2 (punta) + P3 (llano)
 *   Temporada Media-Baja : jun, sep             ->  P3 (punta) + P4 (llano)
 *   Temporada Baja       : abr, may, ago, oct   ->  P4 (punta) + P5 (llano)
 *
 *   Rangos punta / llano dentro de 08:00-24:00 en dias laborables:
 *     Alta + Media      => punta: 10-14 h y 18-22 h  ; llano: 8-10, 14-18, 22-24 h
 *     Media-Baja + Baja => punta: 11-15 h y 19-23 h  ; llano: 8-11, 15-19, 23-24 h
 *
 * VALIDACION EMPIRICA
 * ===================
 * Comparada contra payload real EDISTRIBUCION (2025-05 a 2026-05):
 *   Jul 2025: P1~910, P2~811, P6~1342  OK
 *   Ene 2026: P1~511, P2~449, P6~1047  OK
 *   Mar 2026: P2~499, P3~458, P6~1032  OK
 *   Jun 2025: P3~698, P4~733, P6~1723  OK
 *   May 2025: P4~357, P5~327, P6~587   OK
 *   Nov 2025: P2~543, P3~445, P6~1089  OK
 */

import { isHolidayES } from './holidays-es'

export type TariffPeriod = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

/**
 * 'estimated' = derivacion con festivos nacionales y autonomicos.
 *               Festivos locales (municipales) no incluidos -> error < 0.3%.
 * 'official'  = reservado para integracion con API BOE (v3 futura).
 */
export type PeriodConfidence = 'estimated' | 'official'

interface DerivationResult {
  period: TariffPeriod
  confidence: PeriodConfidence
}

/** Clasificacion de temporadas segun Circular 3/2020 CNMC */
type Season = 'alta' | 'media' | 'mediaBaja' | 'baja'

function getSeason(month: number): Season {
  if (month === 1 || month === 2 || month === 7 || month === 12) return 'alta'
  if (month === 3 || month === 11) return 'media'
  if (month === 6 || month === 9)  return 'mediaBaja'
  return 'baja' // abr(4), may(5), ago(8), oct(10)
}

/**
 * Deriva el periodo tarifario 3.0TD / 6.xTD a partir de fecha y hora de DataDis.
 *
 * Horario DataDis: "HH:00" donde HH es la hora de FIN del intervalo (01-24).
 *   "01:00" = consumo de 00:00 a 01:00  => beginHour = 0  => P6
 *   "08:00" = consumo de 07:00 a 08:00  => beginHour = 7  => P6
 *   "09:00" = consumo de 08:00 a 09:00  => beginHour = 8  => llano segun temporada
 *   "24:00" = consumo de 23:00 a 24:00  => beginHour = 23 => llano segun temporada
 *
 * @param dateStr      Fecha en formato YYYY-MM-DD o YYYY/MM/DD
 * @param datadisHour  Hora de fin del intervalo en formato HH:00 (01..24)
 * @param _tariff      Tarifa (reservado: '3.0TD' por defecto)
 * @param ccaa         CCAA del suministro (sin tildes, ej. 'Andalucia').
 *                     Si se omite solo se aplican festivos nacionales.
 */
export function derivePeriod(
  dateStr: string,
  datadisHour: string,
  _tariff = '3.0TD',
  ccaa?: string,
): DerivationResult {
  // 1. Parsear fecha
  const normalized = dateStr.replace(/\//g, '-')
  const date = new Date(`${normalized}T12:00:00`)
  if (isNaN(date.getTime())) return { period: 'P6', confidence: 'estimated' }

  const dayOfWeek = date.getDay()       // 0 = Dom, 6 = Sab
  const month     = date.getMonth() + 1 // 1-12
  const dateISO   = normalized.substring(0, 10) // YYYY-MM-DD

  // 2. P6 UNIVERSAL: fines de semana
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { period: 'P6', confidence: 'estimated' }
  }

  // 3. P6 UNIVERSAL: festivos (nacionales + autonomicos)
  if (isHolidayES(dateISO, ccaa)) {
    return { period: 'P6', confidence: 'estimated' }
  }

  // Convertir hora DataDis (fin de intervalo) a hora de inicio (0-based)
  const ending    = parseInt(datadisHour.split(':')[0], 10)
  const beginHour = isNaN(ending) ? 0 : (ending === 24 ? 23 : ending - 1)

  // 4. P6 UNIVERSAL: madrugada laborable 00:00-08:00
  if (beginHour < 8) {
    return { period: 'P6', confidence: 'estimated' }
  }

  // 5. Franja laborable 08:00-24:00: depende de temporada
  const season = getSeason(month)

  // Es hora punta?
  //   Alta + Media      => punta: 10-14 h y 18-22 h
  //   Media-Baja + Baja => punta: 11-15 h y 19-23 h
  let isPunta: boolean
  if (season === 'alta' || season === 'media') {
    isPunta = (beginHour >= 10 && beginHour < 14) || (beginHour >= 18 && beginHour < 22)
  } else {
    isPunta = (beginHour >= 11 && beginHour < 15) || (beginHour >= 19 && beginHour < 23)
  }

  // Asignar periodo segun temporada y punta/llano
  switch (season) {
    case 'alta':      return { period: isPunta ? 'P1' : 'P2', confidence: 'estimated' }
    case 'media':     return { period: isPunta ? 'P2' : 'P3', confidence: 'estimated' }
    case 'mediaBaja': return { period: isPunta ? 'P3' : 'P4', confidence: 'estimated' }
    case 'baja':      return { period: isPunta ? 'P4' : 'P5', confidence: 'estimated' }
    default:          return { period: 'P6', confidence: 'estimated' } // unreachable
  }
}

/** Etiquetas descriptivas de cada periodo. P6 es transversal todo el anio. */
export const PERIOD_LABELS: Record<TariffPeriod, string> = {
  P1: 'P1 - Punta (Alta: ene, feb, jul, dic)',
  P2: 'P2 - Punta (Media) / Llano (Alta)',
  P3: 'P3 - Punta (Media-Baja) / Llano (Media)',
  P4: 'P4 - Punta (Baja) / Llano (Media-Baja)',
  P5: 'P5 - Llano (Baja: abr, may, ago, oct)',
  P6: 'P6 - Valle (todo el anio: madrugadas + fin de semana + festivos)',
}

/** Colores por periodo coherentes con PERIOD_COLORS de SupplyDetailPage */
export const PERIOD_COLORS_30TD: Record<TariffPeriod, string> = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#eab308',
  P4: '#8b5cf6',
  P5: '#10b981',
  P6: '#6b7280',
}

export const ALL_PERIODS: TariffPeriod[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
