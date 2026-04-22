import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logError } from './logger'

// logError llama a console.error(prefix, serializedMessage, ...rest)
// Los tests verifican el segundo argumento (el mensaje ya serializado),
// independientemente de lo que pase después en dev/prod para debugging.
describe('logError', () => {
  let spy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    spy.mockRestore()
  })

  const serialized = () => String(spy.mock.calls[0][1])

  it('serializes Error instances with their message', () => {
    logError(new Error('Boom'), 'test.error')
    expect(String(spy.mock.calls[0][0])).toContain('test.error')
    expect(serialized()).toContain('Boom')
  })

  it('serializes Supabase-style errors with message + code + details + hint', () => {
    const supabaseErr = {
      message: 'violates row-level security policy',
      code: '42501',
      details: 'table=empresas',
      hint: 'check policy',
    }
    logError(supabaseErr, 'test.supabase')
    const s = serialized()
    expect(s).toContain('violates row-level security policy')
    expect(s).toContain('[42501]')
    expect(s).toContain('details=table=empresas')
    expect(s).toContain('hint=check policy')
  })

  it('falls back to JSON.stringify for plain objects without message', () => {
    logError({ foo: 'bar' }, 'test.obj')
    expect(serialized()).toContain('"foo":"bar"')
  })

  it('handles string errors directly', () => {
    logError('plain error', 'test.str')
    expect(serialized()).toContain('plain error')
  })

  it('Supabase-style object with message never renders as "[object Object]" in the serialized message', () => {
    logError({ message: 'something went wrong' }, 'test.noObj')
    expect(serialized()).not.toContain('[object Object]')
    expect(serialized()).toBe('something went wrong')
  })
})
