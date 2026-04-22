import { describe, it, expect } from 'vitest'
import { formatDate } from './dates'

describe('formatDate', () => {
  it('returns em-dash for null/undefined/invalid', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('formats short date in es-ES (dd/mm/yyyy)', () => {
    const iso = '2030-04-19'
    const out = formatDate(iso, 'short')
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(out).toContain('19')
    expect(out).toContain('04')
    expect(out).toContain('2030')
  })

  it('formats long date in es-ES with spanish month name', () => {
    const out = formatDate('2030-04-19', 'long')
    expect(out.toLowerCase()).toContain('abril')
    expect(out).toContain('2030')
  })

  it('accepts Date instances', () => {
    const d = new Date(Date.UTC(2030, 0, 15, 12, 0, 0))
    const out = formatDate(d, 'short')
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(out).toContain('2030')
  })
})
