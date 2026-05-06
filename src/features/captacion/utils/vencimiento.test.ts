import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcularSemaforoVencimiento, siguienteAccionLead } from './vencimiento'

describe('calcularSemaforoVencimiento', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fecha fija de referencia: 2026-05-05 (martes) 10:00:00 UTC
    vi.setSystemTime(new Date('2026-05-05T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('null/undefined/empty → sin_fecha', () => {
    expect(calcularSemaforoVencimiento(null).estado).toBe('sin_fecha')
    expect(calcularSemaforoVencimiento(undefined).estado).toBe('sin_fecha')
    expect(calcularSemaforoVencimiento('').estado).toBe('sin_fecha')
    expect(calcularSemaforoVencimiento(null).diasRestantes).toBeNull()
    expect(calcularSemaforoVencimiento(null).label).toBe('Sin vencimiento')
  })

  it('fecha pasada → vencido (con label informando hace cuánto)', () => {
    const sem = calcularSemaforoVencimiento('2026-04-01')
    expect(sem.estado).toBe('vencido')
    expect(sem.diasRestantes).toBeLessThan(0)
    expect(sem.label).toContain('Vencido hace')
  })

  it('15 días futuros → rojo', () => {
    const sem = calcularSemaforoVencimiento('2026-05-20')
    expect(sem.estado).toBe('rojo')
    expect(sem.diasRestantes).toBe(15)
    expect(sem.label).toBe('Vence en 15 días')
  })

  it('50 días futuros → naranja', () => {
    const sem = calcularSemaforoVencimiento('2026-06-24')
    expect(sem.estado).toBe('naranja')
    expect(sem.diasRestantes).toBe(50)
  })

  it('80 días futuros → amarillo', () => {
    const sem = calcularSemaforoVencimiento('2026-07-24')
    expect(sem.estado).toBe('amarillo')
    expect(sem.diasRestantes).toBe(80)
  })

  it('exactamente 90 días → amarillo (NO verde)', () => {
    // Caso borde acordado con Juan + ChatGPT 2026-05-05.
    const sem = calcularSemaforoVencimiento('2026-08-03')
    expect(sem.estado).toBe('amarillo')
    expect(sem.diasRestantes).toBe(90)
  })

  it('200 días futuros → verde', () => {
    const sem = calcularSemaforoVencimiento('2026-11-21')
    expect(sem.estado).toBe('verde')
    expect(sem.diasRestantes).toBe(200)
  })
})

describe('siguienteAccionLead', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('etapa "nuevo" sin fecha → texto base de etapa', () => {
    expect(siguienteAccionLead('nuevo')).toBe('Llamar para presentar Valere')
  })

  it('etapa desconocida → fallback "Revisar caso"', () => {
    expect(siguienteAccionLead('etapa_que_no_existe')).toBe('Revisar caso')
  })

  it('etapa "cerrado" → no aplica overlay aunque haya fecha cercana', () => {
    expect(siguienteAccionLead('cerrado', '2026-05-15')).toBe('Caso cerrado')
  })

  it('etapa nuevo + vencimiento 15 días → mensaje urgente sustituye base', () => {
    const accion = siguienteAccionLead('nuevo', '2026-05-20')
    expect(accion).toBe('Urgente: vence en 15 días — llama ya')
  })

  it('etapa nuevo + vencimiento 50 días → prioridad alta', () => {
    const accion = siguienteAccionLead('nuevo', '2026-06-24')
    expect(accion).toBe('Prioridad alta: vence en 50 días')
  })

  it('etapa nuevo + vencimiento 80 días → contactar ya', () => {
    const accion = siguienteAccionLead('nuevo', '2026-07-24')
    expect(accion).toBe('Contactar ya: vence en 80 días')
  })

  it('etapa nuevo + vencimiento 200 días → texto base, sin overlay', () => {
    expect(siguienteAccionLead('nuevo', '2026-11-21')).toBe('Llamar para presentar Valere')
  })

  it('etapa nuevo + fecha pasada → mensaje vencido', () => {
    const accion = siguienteAccionLead('nuevo', '2026-04-01')
    expect(accion).toBe('Urgente: contrato vencido — llama ya')
  })
})
