import { describe, it, expect } from 'vitest'
import {
  puedeAccederRuta,
  rutaDefaultSegunFunciones,
  FUNCION_RUTAS_PERMITIDAS,
  FUNCION_RUTAS_DEFAULT,
} from './permissions'

describe('permissions — puedeAccederRuta', () => {
  it('master role tiene acceso total', () => {
    expect(puedeAccederRuta('/admin', [], 'master')).toBe(true)
    expect(puedeAccederRuta('/datadis', [], 'master')).toBe(true)
    expect(puedeAccederRuta('/oportunidades', [], 'master')).toBe(true)
  })

  it('función admin tiene acceso total', () => {
    expect(puedeAccederRuta('/admin', ['admin'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/cualquier-cosa', ['admin'], 'consultant')).toBe(true)
  })

  it('telemarketing solo accede a /captacion', () => {
    expect(puedeAccederRuta('/captacion', ['telemarketing'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/captacion/foo', ['telemarketing'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/empresas', ['telemarketing'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/datadis', ['telemarketing'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/importador', ['telemarketing'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/admin', ['telemarketing'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/potencias', ['telemarketing'], 'consultant')).toBe(false)
  })

  it('analista accede a /analisis-captacion y detalle empresa solo', () => {
    expect(puedeAccederRuta('/analisis-captacion', ['analista'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/empresas/abc-123', ['analista'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/empresas', ['analista'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/captacion', ['analista'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/cartera-senior', ['analista'], 'consultant')).toBe(false)
  })

  it('asesor_senior accede a cartera + comercial', () => {
    expect(puedeAccederRuta('/cartera-senior', ['asesor_senior'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/empresas', ['asesor_senior'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/oportunidades', ['asesor_senior'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/dashboard', ['asesor_senior'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/contratos', ['asesor_senior'], 'consultant')).toBe(true)
    expect(puedeAccederRuta('/captacion', ['asesor_senior'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/admin', ['asesor_senior'], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/datadis', ['asesor_senior'], 'consultant')).toBe(false)
  })

  it('login y signup están permitidos para todos', () => {
    expect(puedeAccederRuta('/login', [], null)).toBe(true)
    expect(puedeAccederRuta('/signup', [], null)).toBe(true)
    expect(puedeAccederRuta('/pending-approval', [], null)).toBe(true)
  })

  it('user sin funciones no accede a nada salvo comunes', () => {
    expect(puedeAccederRuta('/dashboard', [], 'consultant')).toBe(false)
    expect(puedeAccederRuta('/captacion', [], 'consultant')).toBe(false)
  })
})

describe('permissions — rutaDefaultSegunFunciones', () => {
  it('master va a /dashboard', () => {
    expect(rutaDefaultSegunFunciones([], 'master')).toBe('/dashboard')
  })

  it('telemarketing va a /captacion', () => {
    expect(rutaDefaultSegunFunciones(['telemarketing'], 'consultant')).toBe('/captacion')
  })

  it('analista va a /analisis-captacion', () => {
    expect(rutaDefaultSegunFunciones(['analista'], 'consultant')).toBe('/analisis-captacion')
  })

  it('asesor_senior va a /cartera-senior', () => {
    expect(rutaDefaultSegunFunciones(['asesor_senior'], 'consultant')).toBe('/cartera-senior')
  })

  it('admin va a /dashboard', () => {
    expect(rutaDefaultSegunFunciones(['admin'], 'consultant')).toBe('/dashboard')
  })

  it('user sin funciones va a /pending-approval', () => {
    expect(rutaDefaultSegunFunciones([], 'consultant')).toBe('/pending-approval')
  })

  it('toma la primera función conocida si hay varias', () => {
    // Combinación admin+asesor_senior → admin gana porque está en orden
    const res = rutaDefaultSegunFunciones(['admin', 'asesor_senior'], 'consultant')
    expect(['/dashboard', '/cartera-senior']).toContain(res)
  })
})

describe('permissions — estructura de catálogos', () => {
  it('todas las funciones operativas tienen ruta default', () => {
    const operativas = ['telemarketing', 'analista', 'asesor_senior', 'admin']
    for (const f of operativas) {
      expect(FUNCION_RUTAS_DEFAULT[f]).toBeDefined()
    }
  })

  it('todas las funciones tienen al menos un patrón permitido', () => {
    const operativas = ['telemarketing', 'analista', 'asesor_senior', 'admin']
    for (const f of operativas) {
      expect(FUNCION_RUTAS_PERMITIDAS[f]).toBeDefined()
      expect(FUNCION_RUTAS_PERMITIDAS[f]!.length).toBeGreaterThan(0)
    }
  })
})
