import { describe, it, expect } from 'vitest'
import { validarFichero, MAX_FILE_BYTES, ACCEPTED_MIME } from './storage'

function fakeFile(opts: { name: string; type: string; size: number }): File {
  const blob = new Blob(['x'.repeat(opts.size)], { type: opts.type })
  // Mock simple: el tamaño que devuelva es el que pasamos
  Object.defineProperty(blob, 'size', { value: opts.size })
  return new File([blob], opts.name, { type: opts.type })
}

describe('storage — validarFichero', () => {
  it('acepta PDF dentro del tamaño', () => {
    const f = fakeFile({ name: 'factura.pdf', type: 'application/pdf', size: 100_000 })
    expect(validarFichero(f)).toBeNull()
  })

  it('acepta JPG dentro del tamaño', () => {
    const f = fakeFile({ name: 'factura.jpg', type: 'image/jpeg', size: 500_000 })
    expect(validarFichero(f)).toBeNull()
  })

  it('acepta PNG dentro del tamaño', () => {
    const f = fakeFile({ name: 'factura.png', type: 'image/png', size: 500_000 })
    expect(validarFichero(f)).toBeNull()
  })

  it('rechaza tipo no permitido (DOCX)', () => {
    const f = fakeFile({ name: 'factura.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 100_000 })
    const result = validarFichero(f)
    expect(result).not.toBeNull()
    expect(result).toMatch(/no permitido/i)
  })

  it('rechaza tipo vacío', () => {
    const f = fakeFile({ name: 'factura', type: '', size: 100_000 })
    const result = validarFichero(f)
    expect(result).not.toBeNull()
  })

  it('rechaza archivo > 15 MB', () => {
    const f = fakeFile({ name: 'huge.pdf', type: 'application/pdf', size: MAX_FILE_BYTES + 1 })
    const result = validarFichero(f)
    expect(result).not.toBeNull()
    expect(result).toMatch(/demasiado grande/i)
  })

  it('rechaza archivo de 0 bytes', () => {
    const f = fakeFile({ name: 'vacio.pdf', type: 'application/pdf', size: 0 })
    const result = validarFichero(f)
    expect(result).not.toBeNull()
    expect(result).toMatch(/vacío/i)
  })

  it('acepta exactamente el límite (15 MB)', () => {
    const f = fakeFile({ name: 'limite.pdf', type: 'application/pdf', size: MAX_FILE_BYTES })
    expect(validarFichero(f)).toBeNull()
  })

  it('ACCEPTED_MIME tiene PDF, JPEG, PNG', () => {
    expect(ACCEPTED_MIME).toContain('application/pdf')
    expect(ACCEPTED_MIME).toContain('image/jpeg')
    expect(ACCEPTED_MIME).toContain('image/png')
  })
})
