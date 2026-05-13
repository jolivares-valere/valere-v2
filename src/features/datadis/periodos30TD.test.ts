/**
 * periodos30TD.test.ts -- Casos borde acordados para validar derivacion de periodos
 *
 * Valida que:
 *   1. Los festivos nacionales y autonomicos devuelven P6 las 24h
 *   2. Los fines de semana devuelven P6 las 24h
 *   3. La madrugada laborable (00:00-08:00) devuelve P6
 *   4. Las horas laborables 08:00-24:00 devuelven el periodo correcto por temporada
 *
 * Casos acordados en sesion 2026-05-14 (validacion normativa Circular 3/2020 CNMC).
 */

import { describe, it, expect } from 'vitest'
import { derivePeriod } from './periodos30TD'

// Helper: hora de inicio del intervalo -> hora DataDis (fin del intervalo)
// DataDis usa hora FIN: "09:00" significa el intervalo 08:00-09:00
function hr(beginHour: number): string {
  const end = beginHour + 1
  return end === 24 ? '24:00' : `${String(end).padStart(2, '0')}:00`
}

describe('derivePeriod - festivos nacionales -> P6', () => {
  const horaLaboral = hr(11) // 11:00-12:00, seria P1 o similar si no fuera festivo

  it('2026-01-01 Anio Nuevo (jueves) -> P6 todo el dia', () => {
    expect(derivePeriod('2026-01-01', horaLaboral).period).toBe('P6')
  })

  it('2026-01-06 Reyes (martes) -> P6 todo el dia', () => {
    expect(derivePeriod('2026-01-06', horaLaboral).period).toBe('P6')
  })

  it('2025-05-01 Dia del Trabajo (jueves) -> P6 todo el dia', () => {
    expect(derivePeriod('2025-05-01', horaLaboral).period).toBe('P6')
  })

  it('2025-08-15 Asuncion (viernes) -> P6 todo el dia', () => {
    expect(derivePeriod('2025-08-15', horaLaboral).period).toBe('P6')
  })

  it('2025-12-25 Navidad (jueves) -> P6 todo el dia', () => {
    expect(derivePeriod('2025-12-25', horaLaboral).period).toBe('P6')
  })

  it('2025-04-18 Viernes Santo (nacional) -> P6 todo el dia', () => {
    expect(derivePeriod('2025-04-18', horaLaboral).period).toBe('P6')
  })
})

describe('derivePeriod - festivos autonomicos Andalucia -> P6', () => {
  const horaLaboral = hr(11)
  const ccaa = 'Andalucia'

  it('2025-02-28 Dia de Andalucia (viernes) con ccaa=Andalucia -> P6', () => {
    expect(derivePeriod('2025-02-28', horaLaboral, '3.0TD', ccaa).period).toBe('P6')
  })

  it('2025-04-17 Jueves Santo Andalucia (autonomico) -> P6', () => {
    expect(derivePeriod('2025-04-17', horaLaboral, '3.0TD', ccaa).period).toBe('P6')
  })

  it('2025-02-28 Dia de Andalucia SIN ccaa -> NO necesariamente P6 (festivo autonomico no incluido)', () => {
    // Sin ccaa, el 28-feb no es festivo nacional -> puede caer en P2 o P3 segun hora
    const result = derivePeriod('2025-02-28', horaLaboral)
    // Solo verificamos que sin ccaa el resultado no es forzosamente P6 por festivo
    // (puede ser P6 si cae en fin de semana, pero 2025-02-28 es viernes)
    expect(['P1','P2','P3','P4','P5']).toContain(result.period)
  })
})

describe('derivePeriod - fines de semana -> P6', () => {
  // 2026-01-10 es sabado, 2026-01-11 es domingo (temporada Alta, que usaria P1/P2 laborable)
  it('Sabado en temporada Alta -> P6', () => {
    expect(derivePeriod('2026-01-10', hr(11)).period).toBe('P6')
    expect(derivePeriod('2026-01-10', hr(3)).period).toBe('P6')
  })

  it('Domingo en temporada Media -> P6', () => {
    // 2026-03-01 es domingo (temporada Media, que usaria P2/P3 laborable)
    expect(derivePeriod('2026-03-01', hr(11)).period).toBe('P6')
  })

  it('Fin de semana en temporada Baja -> P6', () => {
    // 2025-10-11 es sabado (temporada Baja)
    expect(derivePeriod('2025-10-11', hr(12)).period).toBe('P6')
  })
})

describe('derivePeriod - madrugada laborable 00:00-08:00 -> P6', () => {
  // 2026-01-05 es lunes (laborable, temporada Alta)
  it('Laborable enero 03:00 -> P6', () => {
    expect(derivePeriod('2026-01-05', hr(3)).period).toBe('P6')
  })

  it('Laborable julio 07:00 -> P6', () => {
    // 2025-07-07 es lunes
    expect(derivePeriod('2025-07-07', hr(7)).period).toBe('P6')
  })

  it('Hora fin exactamente 08:00 (beginHour=7) -> P6', () => {
    // DataDis "08:00" = intervalo 07:00-08:00 -> beginHour=7 -> P6
    expect(derivePeriod('2026-01-05', '08:00').period).toBe('P6')
  })

  it('Hora fin 09:00 (beginHour=8) -> llano, NO P6', () => {
    // DataDis "09:00" = intervalo 08:00-09:00 -> beginHour=8 -> P2 (Alta, llano)
    const result = derivePeriod('2026-01-05', '09:00')
    expect(result.period).toBe('P2')
  })
})

describe('derivePeriod - temporada Alta (ene, feb, jul, dic) - laborables 08-24h', () => {
  // Lunes 5 enero 2026 (laborable, temporada Alta)
  it('laborable enero 11:00 (punta 10-14h) -> P1', () => {
    expect(derivePeriod('2026-01-05', hr(11)).period).toBe('P1')
  })
  it('laborable enero 15:00 (llano 14-18h) -> P2', () => {
    expect(derivePeriod('2026-01-05', hr(15)).period).toBe('P2')
  })
  it('laborable enero 19:00 (punta 18-22h) -> P1', () => {
    expect(derivePeriod('2026-01-05', hr(19)).period).toBe('P1')
  })
  it('laborable enero 23:00 (llano 22-24h) -> P2', () => {
    expect(derivePeriod('2026-01-05', hr(23)).period).toBe('P2')
  })
  // Lunes 7 julio 2025 (laborable, temporada Alta)
  it('laborable julio 11:00 -> P1', () => {
    expect(derivePeriod('2025-07-07', hr(11)).period).toBe('P1')
  })
  it('laborable julio 15:00 -> P2', () => {
    expect(derivePeriod('2025-07-07', hr(15)).period).toBe('P2')
  })
})

describe('derivePeriod - temporada Media (mar, nov) - laborables 08-24h', () => {
  // Lunes 3 marzo 2025 (laborable, temporada Media)
  it('laborable marzo 11:00 (punta 10-14h) -> P2', () => {
    expect(derivePeriod('2025-03-03', hr(11)).period).toBe('P2')
  })
  it('laborable marzo 15:00 (llano 14-18h) -> P3', () => {
    expect(derivePeriod('2025-03-03', hr(15)).period).toBe('P3')
  })
  // Lunes 3 noviembre 2025 (laborable, temporada Media)
  it('laborable noviembre 19:00 (punta 18-22h) -> P2', () => {
    expect(derivePeriod('2025-11-03', hr(19)).period).toBe('P2')
  })
  it('laborable noviembre 09:00 (llano 8-10h) -> P3', () => {
    expect(derivePeriod('2025-11-03', hr(9)).period).toBe('P3')
  })
})

describe('derivePeriod - temporada Media-Baja (jun, sep) - laborables 08-24h', () => {
  // Lunes 2 junio 2025 (laborable, temporada Media-Baja)
  it('laborable junio 12:00 (punta 11-15h) -> P3', () => {
    expect(derivePeriod('2025-06-02', hr(12)).period).toBe('P3')
  })
  it('laborable junio 16:00 (llano 15-19h) -> P4', () => {
    expect(derivePeriod('2025-06-02', hr(16)).period).toBe('P4')
  })
  // Lunes 1 septiembre 2025 (laborable, temporada Media-Baja)
  it('laborable septiembre 11:00 (punta 11-15h) -> P3', () => {
    expect(derivePeriod('2025-09-01', hr(11)).period).toBe('P3')
  })
  it('laborable septiembre 09:00 (llano 8-11h) -> P4', () => {
    expect(derivePeriod('2025-09-01', hr(9)).period).toBe('P4')
  })
})

describe('derivePeriod - temporada Baja (abr, may, ago, oct) - laborables 08-24h', () => {
  // Lunes 6 octubre 2025 (laborable, temporada Baja)
  it('laborable octubre 12:00 (punta 11-15h) -> P4', () => {
    expect(derivePeriod('2025-10-06', hr(12)).period).toBe('P4')
  })
  it('laborable octubre 16:00 (llano 15-19h) -> P5', () => {
    expect(derivePeriod('2025-10-06', hr(16)).period).toBe('P5')
  })
  // Lunes 5 mayo 2025 (laborable, temporada Baja)
  it('laborable mayo 20:00 (punta 19-23h) -> P4', () => {
    expect(derivePeriod('2025-05-05', hr(20)).period).toBe('P4')
  })
  it('laborable mayo 09:00 (llano 8-11h) -> P5', () => {
    expect(derivePeriod('2025-05-05', hr(9)).period).toBe('P5')
  })
})

describe('derivePeriod - confidence always estimated', () => {
  it('siempre devuelve confidence=estimated (sin festivos oficiales BOE)', () => {
    const result = derivePeriod('2026-01-05', hr(11))
    expect(result.confidence).toBe('estimated')
  })
})
