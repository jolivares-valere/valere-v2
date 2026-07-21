import { describe, expect, it } from 'vitest'
import { periodosPorTarifa } from './periodos'

describe('periodosPorTarifa (regla PR-3.2)', () => {
  it('2.0TD pide 2 potencias + 3 energias', () => {
    expect(periodosPorTarifa('2.0TD')).toEqual({ potencias: 2, energias: 3 })
  })
  it('tolera minusculas y espacios', () => {
    expect(periodosPorTarifa(' 2.0td ')).toEqual({ potencias: 2, energias: 3 })
  })
  it('3.0TD y 6.1TD piden 6 + 6', () => {
    expect(periodosPorTarifa('3.0TD')).toEqual({ potencias: 6, energias: 6 })
    expect(periodosPorTarifa('6.1TD')).toEqual({ potencias: 6, energias: 6 })
  })
  it('tarifa desconocida o null cae al caso general 6 + 6', () => {
    expect(periodosPorTarifa('RL4')).toEqual({ potencias: 6, energias: 6 })
    expect(periodosPorTarifa(null)).toEqual({ potencias: 6, energias: 6 })
    expect(periodosPorTarifa(undefined)).toEqual({ potencias: 6, energias: 6 })
  })
})
