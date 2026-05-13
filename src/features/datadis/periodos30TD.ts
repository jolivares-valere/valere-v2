/**
 * periodos30TD.ts — Derivación estimada de períodos tarifarios 3.0TD / 6.1TD
 *
 * ⚠️  ESTIMACIÓN v1: no incluye festivos nacionales, autonómicos ni locales.
 *     Los festivos se tratan como laborables → error < 2% en la asignación.
 *
 * TODO v2: incorporar calendario BOE + festivos autonómicos por provinceCode.
 *           Fuente oficial: https://www.boe.es/boe/dias/YYYY/01/02/ (listado anual)
 *
 * Referencia normativa: Circular 3/2020 CNMC — Estructura de peajes de acceso.
 * Aplicable a tarifas 3.0TD (Baja Tensión > 15 kW) y 6.1TD (Media Tensión).
 */

export type TariffPeriod = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

/**
 * 'estimated' = derivación por hora/día/mes sin calendario de festivos.
 * 'official'  = reservado para v2 con festivos incorporados.
 */
export type PeriodConfidence = 'estimated' | 'official'

interface DerivationResult {
  period: TariffPeriod
  confidence: PeriodConfidence
}

/**
 * Deriva el período tarifario 3.0TD a partir de fecha y hora de DataDis.
 *
 * Horario DataDis: "HH:00" donde HH es la hora de FIN del intervalo (01–24).
 *   "01:00" = consumo de 00:00 a 01:00
 *   "24:00" = consumo de 23:00 a 24:00
 *
 * Temporadas:
 *   Invierno (Oct–Mar): aplican P1 / P2 / P3
 *   Verano  (Abr–Sep): aplican P4 / P5 / P6
 *
 * Rangos horarios (hora de inicio del intervalo, 0-based):
 *
 *   INVIERNO (Oct–Mar):
 *     P1 Punta : 10–14h  y  18–22h  (laborables)
 *     P2 Llano : 8–10h   y  14–18h  y  22–24h   (laborables)
 *     P3 Valle : 0–8h    (laborables) + todo el fin de semana
 *
 *   VERANO (Abr–Sep):
 *     P4 Punta : 11–15h  y  19–23h  (laborables)
 *     P5 Llano : 8–11h   y  15–19h  y  23–24h   (laborables)
 *     P6 Valle : 0–8h    (laborables) + todo el fin de semana
 */
export function derivePeriod(
  dateStr: string,
  datadisHour: string,
  _tariff = '3.0TD', // reservado para ramificar en 2.0TD cuando haga falta
): DerivationResult {
  // Parsear fecha
  const normalized = dateStr.replace(/\//g, '-')
  const date = new Date(`${normalized}T12:00:00`)
  if (isNaN(date.getTime())) return { period: 'P3', confidence: 'estimated' }

  const dayOfWeek = date.getDay() // 0 = Dom, 6 = Sáb
  const month     = date.getMonth() + 1 // 1–12

  // Fin de semana → siempre valle (P3 invierno / P6 verano)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const isWinter = month <= 3 || month >= 10
    return { period: isWinter ? 'P3' : 'P6', confidence: 'estimated' }
  }

  // Convertir hora DataDis (fin) a hora de inicio (0-based)
  const ending    = parseInt(datadisHour.split(':')[0], 10)
  const beginHour = isNaN(ending) ? 0 : (ending === 24 ? 23 : ending - 1)

  const isSummer = month >= 4 && month <= 9

  if (isSummer) {
    // P4: 11–15h y 19–23h
    if ((beginHour >= 11 && beginHour < 15) || (beginHour >= 19 && beginHour < 23)) {
      return { period: 'P4', confidence: 'estimated' }
    }
    // P5: 8–11h y 15–19h y 23h
    if ((beginHour >= 8 && beginHour < 11) || (beginHour >= 15 && beginHour < 19) || beginHour === 23) {
      return { period: 'P5', confidence: 'estimated' }
    }
    // P6: 0–8h
    return { period: 'P6', confidence: 'estimated' }
  } else {
    // Invierno: Oct–Mar
    // P1: 10–14h y 18–22h
    if ((beginHour >= 10 && beginHour < 14) || (beginHour >= 18 && beginHour < 22)) {
      return { period: 'P1', confidence: 'estimated' }
    }
    // P2: 8–10h y 14–18h y 22–24h
    if ((beginHour >= 8 && beginHour < 10) || (beginHour >= 14 && beginHour < 18) || beginHour >= 22) {
      return { period: 'P2', confidence: 'estimated' }
    }
    // P3: 0–8h
    return { period: 'P3', confidence: 'estimated' }
  }
}

/** Etiquetas descriptivas para mostrar en UI */
export const PERIOD_LABELS: Record<TariffPeriod, string> = {
  P1: 'P1 · Punta invierno',
  P2: 'P2 · Llano invierno',
  P3: 'P3 · Valle invierno',
  P4: 'P4 · Punta verano',
  P5: 'P5 · Llano verano',
  P6: 'P6 · Valle verano',
}

/** Colores por período coherentes con PERIOD_COLORS de SupplyDetailPage */
export const PERIOD_COLORS_30TD: Record<TariffPeriod, string> = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#3b82f6',
  P4: '#8b5cf6',
  P5: '#10b981',
  P6: '#6b7280',
}

export const ALL_PERIODS: TariffPeriod[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
