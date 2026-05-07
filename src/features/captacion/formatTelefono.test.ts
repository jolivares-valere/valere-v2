import { describe, it, expect } from 'vitest'
import { formatTelefonoConExtension } from './api'

describe('formatTelefonoConExtension', () => {
  it('teléfono + extensión → "tel · Ext. ext"', () => {
    expect(formatTelefonoConExtension('957 767 700', '123')).toBe('957 767 700 · Ext. 123')
  })

  it('solo teléfono → teléfono pelado', () => {
    expect(formatTelefonoConExtension('957 767 700', null)).toBe('957 767 700')
    expect(formatTelefonoConExtension('957 767 700', '')).toBe('957 767 700')
    expect(formatTelefonoConExtension('957 767 700', undefined)).toBe('957 767 700')
  })

  it('solo extensión sin teléfono → "Ext. ext"', () => {
    expect(formatTelefonoConExtension(null, '123')).toBe('Ext. 123')
    expect(formatTelefonoConExtension('', '123')).toBe('Ext. 123')
  })

  it('null/empty/undefined → ""', () => {
    expect(formatTelefonoConExtension(null, null)).toBe('')
    expect(formatTelefonoConExtension(undefined, undefined)).toBe('')
    expect(formatTelefonoConExtension('', '')).toBe('')
    expect(formatTelefonoConExtension('   ', '   ')).toBe('')
  })

  it('trim de espacios alrededor', () => {
    expect(formatTelefonoConExtension('  957 767 700  ', '  123  ')).toBe('957 767 700 · Ext. 123')
  })
})
