import { describe, it, expect } from 'vitest'
import { agruparPorMes, backfillIncompleto, csvDiario, type ConsumoDiario } from './curva'

function dia(fecha: string, kwh = 10): ConsumoDiario {
  return { fecha, consumo_kwh: kwh, excedente_kwh: 0, horas: 24, horas_estimadas: 0 }
}

function mesEntero(mes: string, dias: number): ConsumoDiario[] {
  return Array.from({ length: dias }, (_, i) => dia(`${mes}-${String(i + 1).padStart(2, '0')}`))
}

describe('agruparPorMes', () => {
  it('agrega y ordena por mes, suma kWh', () => {
    const out = agruparPorMes([...mesEntero('2026-06', 30), dia('2026-05-31', 5)], '2026-07-23')
    expect(out.map((m) => m.mes)).toEqual(['2026-05', '2026-06'])
    expect(out[1].consumo_kwh).toBe(300)
    expect(out[1].completo).toBe(true) // 30/30 días de junio
    expect(out[0].completo).toBe(false) // solo 1/31 días de mayo
  })

  it('el mes en curso nunca se marca incompleto', () => {
    const out = agruparPorMes(mesEntero('2026-07', 22), '2026-07-23')
    expect(out[0].completo).toBe(true)
  })
})

describe('backfillIncompleto', () => {
  it('sin datos = incompleto', () => {
    expect(backfillIncompleto([], null, '2026-07-23')).toBe(true)
  })
  it('meses completos y dato fresco = completo', () => {
    const meses = agruparPorMes([...mesEntero('2026-06', 30), ...mesEntero('2026-07', 22)], '2026-07-23')
    expect(backfillIncompleto(meses, '2026-07-22', '2026-07-23')).toBe(false)
  })
  it('hueco en mes pasado = incompleto', () => {
    const meses = agruparPorMes([...mesEntero('2026-06', 12), ...mesEntero('2026-07', 22)], '2026-07-23')
    expect(backfillIncompleto(meses, '2026-07-22', '2026-07-23')).toBe(true)
  })
  it('dato viejo (>45 dias) = incompleto', () => {
    const meses = agruparPorMes(mesEntero('2026-04', 30), '2026-07-23')
    expect(backfillIncompleto(meses, '2026-04-30', '2026-07-23')).toBe(true)
  })
})

describe('csvDiario', () => {
  it('cabecera + coma decimal es-ES', () => {
    const csv = csvDiario('ES001', [{ fecha: '2026-07-01', consumo_kwh: 12.5, excedente_kwh: 0, horas: 24, horas_estimadas: 2 }])
    const [head, fila] = csv.split('\n')
    expect(head).toBe('cups;fecha;consumo_kwh;excedente_kwh;horas;horas_estimadas')
    expect(fila).toBe('ES001;2026-07-01;12,5;0;24;2')
  })
})
