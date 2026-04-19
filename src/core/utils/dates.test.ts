import { describe, it, expect } from 'vitest'
import { formatDate } from './dates'

describe('formatDate', () => {
  it('returns em-dash for null/undefined/invalid', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })
  it('formats short date in es-ES', () => {
    expect(formatDate('2026-04-19', 'short')).toMatch(/19\/04\/2026/)
  })
  it('formats long date in es-ES with month name', () => {
    expect(formatDate('2026-04-19', 'long')).toMatch(/abril/)
  })
})
