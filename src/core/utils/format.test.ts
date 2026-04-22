import { describe, it, expect } from 'vitest'
import { formatEur, formatPct, safeNum, safeArray, generateCsv } from './format'

describe('formatEur', () => {
  it('formats numbers with es-ES decimal comma and EUR suffix', () => {
    expect(formatEur(1234.5)).toMatch(/1.?234,50 €/)
  })
  it('returns 0,00 € for null/undefined', () => {
    expect(formatEur(null)).toBe('0,00 €')
    expect(formatEur(undefined)).toBe('0,00 €')
  })
})

describe('formatPct', () => {
  it('formats with one decimal by default', () => {
    expect(formatPct(33.333)).toBe('33.3%')
  })
  it('respects custom decimals', () => {
    expect(formatPct(33.333, 2)).toBe('33.33%')
  })
})

describe('safeNum', () => {
  it.each([
    [42, 42],
    ['12.5', 12.5],
    [null, 0],
    [undefined, 0],
    ['abc', 0],
    [NaN, 0],
  ])('safeNum(%p) → %p', (input, expected) => {
    expect(safeNum(input)).toBe(expected)
  })
})

describe('safeArray', () => {
  it('returns array of given length filled with 0 when input is invalid', () => {
    expect(safeArray(null, 3)).toEqual([0, 0, 0])
  })
  it('coerces values when array has enough length', () => {
    expect(safeArray(['1', '2', 'x'], 3)).toEqual([1, 2, 0])
  })
})

describe('generateCsv', () => {
  it('escapes quotes correctly', () => {
    const csv = generateCsv(['a', 'b'], [['x', 'has "quotes"']])
    expect(csv).toBe('"a","b"\n"x","has ""quotes"""')
  })
})
