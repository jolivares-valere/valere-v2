import { describe, it, expect } from 'vitest'
import {
  MOTIVOS_TELEMARKETING,
  MOTIVOS_AVANZADO,
  motivosParaUsuario,
} from './motivos'

describe('motivos pérdida — UI filtrada', () => {
  it('telemarketing tiene 8 motivos (7 + otro) y todos los códigos coinciden con enum BD', () => {
    expect(MOTIVOS_TELEMARKETING.length).toBe(8)
    const codigos = MOTIVOS_TELEMARKETING.map(m => m.codigo)
    // Validar contra enum motivo_perdida_enum (verificado en BD prod)
    const enumValido = [
      'no_contesta', 'numero_erroneo', 'no_es_decisor', 'ya_tiene_consultor',
      'no_quiere_mover', 'no_envia_factura', 'lista_robinson', 'otro',
    ]
    for (const c of codigos) {
      expect(enumValido).toContain(c)
    }
  })

  it('avanzado incluye motivos extra de análisis y senior', () => {
    expect(MOTIVOS_AVANZADO.length).toBeGreaterThan(MOTIVOS_TELEMARKETING.length)
    const codigos = MOTIVOS_AVANZADO.map(m => m.codigo)
    expect(codigos).toContain('no_autoriza_datadis')
    expect(codigos).toContain('precio_insuficiente')
    expect(codigos).toContain('contrato_con_penalizacion')
    expect(codigos).toContain('otro')
  })

  it('motivosParaUsuario(["telemarketing"]) devuelve catálogo simple', () => {
    const result = motivosParaUsuario(['telemarketing'])
    expect(result).toBe(MOTIVOS_TELEMARKETING)
  })

  it('motivosParaUsuario(["analista"]) devuelve catálogo avanzado', () => {
    const result = motivosParaUsuario(['analista'])
    expect(result).toBe(MOTIVOS_AVANZADO)
  })

  it('motivosParaUsuario(["asesor_senior"]) devuelve catálogo avanzado', () => {
    const result = motivosParaUsuario(['asesor_senior'])
    expect(result).toBe(MOTIVOS_AVANZADO)
  })

  it('motivosParaUsuario(["admin"]) devuelve catálogo avanzado', () => {
    const result = motivosParaUsuario(['admin'])
    expect(result).toBe(MOTIVOS_AVANZADO)
  })

  it('motivosParaUsuario(["telemarketing","analista"]) devuelve avanzado (combinación)', () => {
    const result = motivosParaUsuario(['telemarketing', 'analista'])
    expect(result).toBe(MOTIVOS_AVANZADO)
  })

  it('motivosParaUsuario(null) devuelve avanzado por defecto seguro', () => {
    const result = motivosParaUsuario(null)
    expect(result).toBe(MOTIVOS_AVANZADO)
  })

  it('motivosParaUsuario(undefined) devuelve avanzado por defecto seguro', () => {
    const result = motivosParaUsuario(undefined)
    expect(result).toBe(MOTIVOS_AVANZADO)
  })

  it('último motivo es siempre "otro" para campo libre editable', () => {
    expect(MOTIVOS_TELEMARKETING[MOTIVOS_TELEMARKETING.length - 1]?.codigo).toBe('otro')
    expect(MOTIVOS_AVANZADO[MOTIVOS_AVANZADO.length - 1]?.codigo).toBe('otro')
  })
})
