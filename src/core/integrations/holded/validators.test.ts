// ═══════════════════════════════════════════════════════════════════
// Tests Vitest — validadores Holded
// ═══════════════════════════════════════════════════════════════════
//
// Cobertura: NIF persona, NIE, CIF (con letra inicial determinando si
// el control es dígito, letra o ambos), VAT intracom, casos edge,
// helpers de masking.
//
// Espejos de los tests SQL en `valida_nif_cif()` que validamos en
// dry-run contra prod 2026-04-27 — los casos coinciden 1:1.
// ═══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  normalizaNifCif,
  clasificaNifCif,
  validaNifCif,
  maskNif,
  maskIban,
  isValidEmail,
} from './validators'

describe('normalizaNifCif', () => {
  it('uppercase y elimina espacios/guiones/puntos', () => {
    expect(normalizaNifCif('  b-10.759.520  ')).toBe('B10759520')
  })
  it('devuelve null para empty / null / undefined', () => {
    expect(normalizaNifCif(null)).toBeNull()
    expect(normalizaNifCif(undefined)).toBeNull()
    expect(normalizaNifCif('')).toBeNull()
    expect(normalizaNifCif('  ')).toBeNull()
  })
})

describe('clasificaNifCif', () => {
  it('clasifica CIF', () => {
    expect(clasificaNifCif('B10759520')).toBe('CIF')
  })
  it('clasifica NIF persona', () => {
    expect(clasificaNifCif('12345678Z')).toBe('NIF')
  })
  it('clasifica NIE', () => {
    expect(clasificaNifCif('X1234567L')).toBe('NIE')
  })
  it('clasifica VAT', () => {
    expect(clasificaNifCif('ESB10759520')).toBe('VAT')
    expect(clasificaNifCif('PT123456789')).toBe('VAT')
  })
  it('detecta INVALID en formato roto', () => {
    expect(clasificaNifCif('1234')).toBe('INVALID')
    expect(clasificaNifCif('ABC')).toBe('INVALID')
    expect(clasificaNifCif('99XX99X9')).toBe('INVALID')
  })
  it('devuelve EMPTY para null/empty', () => {
    expect(clasificaNifCif(null)).toBe('EMPTY')
    expect(clasificaNifCif('')).toBe('EMPTY')
  })
})

describe('validaNifCif — casos válidos', () => {
  it.each([
    ['B10759520', 'Valere Consultores SL (CIF letra inicial → dígito o letra)'],
    ['12345678Z', 'NIF persona estándar'],
    ['00000000T', 'NIF con todo ceros (T es la letra para 0)'],
    ['X1234567L', 'NIE válido prefijo X'],
    ['A12345674', 'CIF con control numérico (letra A obliga dígito)'],
    ['ESB10759520', 'VAT intracom ES'],
    ['PT123456789', 'VAT intracom PT'],
  ])('%s → true (%s)', (nif) => {
    expect(validaNifCif(nif)).toBe(true)
  })
})

describe('validaNifCif — casos inválidos', () => {
  it.each([
    ['B10759521', 'CIF Valere con último dígito alterado'],
    ['12345678A', 'NIF con letra de control mal'],
    ['', 'string vacío'],
    [null, 'null'],
    ['1234', 'demasiado corto'],
    ['XX99999999', 'VAT con prefijo no válido'],
  ])('%s → false (%s)', (nif) => {
    expect(validaNifCif(nif)).toBe(false)
  })
})

describe('validaNifCif — paridad con tests SQL', () => {
  it('reproduce los 10 casos de control SQL', () => {
    const cases: Array<[string | null, boolean]> = [
      ['B10759520', true],
      ['12345678Z', true],
      ['00000000T', true],
      ['X1234567L', true],
      ['B10759521', false],
      ['A12345674', true],
      ['12345678A', false],
      [null, false],
      ['ESB10759520', true],
      ['XX99999999', false],
    ]
    for (const [input, expected] of cases) {
      expect(validaNifCif(input), `${input ?? 'null'} → ${expected}`).toBe(expected)
    }
  })
})

describe('maskNif', () => {
  it('enmascara CIF de longitud 9 dejando primer y último', () => {
    expect(maskNif('B10759520')).toBe('B*******0')
  })
  it('normaliza antes de enmascarar', () => {
    expect(maskNif('  b-10.759.520  ')).toBe('B*******0')
  })
  it('devuelve null para null/empty', () => {
    expect(maskNif(null)).toBeNull()
    expect(maskNif('')).toBeNull()
  })
  it('devuelve *** para inputs muy cortos', () => {
    expect(maskNif('AB')).toBe('***')
  })
})

describe('maskIban', () => {
  it('enmascara IBAN ES estándar (24 chars)', () => {
    const masked = maskIban('ES7621000418401234567891')
    expect(masked).toMatch(/^ES76\*+7891$/)
    expect(masked!.length).toBe(24)
  })
  it('elimina espacios antes', () => {
    expect(maskIban('ES76 2100 0418 4012 3456 7891')).toMatch(/^ES76\*+7891$/)
  })
  it('devuelve *** para input muy corto', () => {
    expect(maskIban('ABC')).toBe('***')
  })
  it('devuelve null para null/empty', () => {
    expect(maskIban(null)).toBeNull()
    expect(maskIban('')).toBeNull()
  })
})

describe('isValidEmail', () => {
  it.each([
    ['admin@valereconsultores.com', true],
    ['a@b.co', true],
    ['no-arroba', false],
    ['multiple@@arrobas.com', false],
    ['', false],
    [null, false],
  ])('%s → %s', (email, expected) => {
    expect(isValidEmail(email as string | null)).toBe(expected)
  })
})
