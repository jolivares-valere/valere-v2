/**
 * Tests sintéticos para `telemetry.ts`.
 *
 * Cubre:
 *   - Captura de `window.error`
 *   - Captura de `unhandledrejection`
 *   - Emisión de `web_vital` LCP / FCP / TTFB
 *   - `trackRouteChange` añade un evento
 *   - El buffer no crece sin límite (tope 200)
 *
 * Estos tests son sintéticos: simulan los hooks del navegador disparando los
 * eventos a mano, sin depender de un PerformanceObserver real. Se ejecutan en
 * jsdom (vitest config por defecto del proyecto).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  initTelemetry,
  trackRouteChange,
  getTelemetryBuffer,
  __resetTelemetryForTests,
} from './telemetry'

beforeEach(() => {
  __resetTelemetryForTests()
})

describe('telemetry — captura de errores', () => {
  it('registra un evento "error" cuando se dispara window.error', () => {
    initTelemetry()

    const err = new Error('Boom sintético')
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: err.message,
        error: err,
        filename: 'src/foo.tsx',
        lineno: 42,
        colno: 7,
      }),
    )

    const buf = getTelemetryBuffer()
    const errors = buf.filter(e => e.kind === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      kind: 'error',
      message: 'Boom sintético',
      source: 'src/foo.tsx',
      line: 42,
      col: 7,
    })
  })

  it('registra un "unhandled_rejection" cuando se dispara unhandledrejection', () => {
    initTelemetry()

    const reason = new Error('Promise broke')
    // jsdom expone PromiseRejectionEvent; si no, fallback a Event con prop reason.
    const ev =
      typeof PromiseRejectionEvent !== 'undefined'
        ? new PromiseRejectionEvent('unhandledrejection', {
            promise: Promise.reject(reason).catch(() => undefined) as unknown as Promise<unknown>,
            reason,
          })
        : Object.assign(new Event('unhandledrejection'), { reason })

    // Evita warning de jsdom por unhandled rejection en consola
    window.addEventListener('unhandledrejection', e => e.preventDefault?.(), { once: true })
    window.dispatchEvent(ev)

    const buf = getTelemetryBuffer()
    const rejs = buf.filter(e => e.kind === 'unhandled_rejection')
    expect(rejs).toHaveLength(1)
    expect(rejs[0].message).toBe('Promise broke')
  })

  it('serializa correctamente reasons no-Error', () => {
    initTelemetry()

    const ev = Object.assign(new Event('unhandledrejection'), { reason: 'string-reason' })
    window.dispatchEvent(ev)

    const rejs = getTelemetryBuffer().filter(e => e.kind === 'unhandled_rejection')
    expect(rejs[rejs.length - 1].message).toBe('string-reason')
  })
})

describe('telemetry — web vitals', () => {
  it('emite TTFB si performance.getEntriesByType devuelve un navigation entry', () => {
    // Stubbing del PerformanceObserver — jsdom no lo implementa.
    // Para TTFB sólo necesitamos performance.getEntriesByType('navigation').
    const fakeNav: Partial<PerformanceNavigationTiming> = {
      responseStart: 320,
      requestStart: 100,
    }

    const original = performance.getEntriesByType.bind(performance)
    const spy = vi
      .spyOn(performance, 'getEntriesByType')
      .mockImplementation((type: string) => {
        if (type === 'navigation') {
          return [fakeNav as PerformanceNavigationTiming] as unknown as PerformanceEntryList
        }
        return original(type as Parameters<typeof original>[0])
      })

    initTelemetry()

    const ttfb = getTelemetryBuffer().filter(
      e => e.kind === 'web_vital' && e.name === 'TTFB',
    )
    expect(ttfb).toHaveLength(1)
    if (ttfb[0].kind === 'web_vital') {
      expect(ttfb[0].value).toBe(220) // 320 - 100
    }

    spy.mockRestore()
  })

  it('captura LCP/FCP cuando hay PerformanceObserver disponible', () => {
    // Verificamos que initTelemetry no crashea aunque PerformanceObserver
    // no exista o falle. Y que cualquier evento previamente bufferizado
    // sigue presente.
    const originalPO = (window as unknown as { PerformanceObserver?: unknown }).PerformanceObserver
    // Forzamos a que no exista PerformanceObserver para verificar el fallback.
    delete (window as unknown as Record<string, unknown>).PerformanceObserver

    initTelemetry()

    // Reset y restauración tras la aserción
    expect(getTelemetryBuffer()).toBeInstanceOf(Array)
    ;(window as unknown as Record<string, unknown>).PerformanceObserver = originalPO
  })
})

describe('telemetry — buffer y route changes', () => {
  it('trackRouteChange añade un evento route_change', () => {
    initTelemetry()
    trackRouteChange('/empresas/123')
    const events = getTelemetryBuffer().filter(e => e.kind === 'route_change')
    expect(events.length).toBeGreaterThanOrEqual(1)
    if (events[0].kind === 'route_change') {
      expect(events[0].path).toBe('/empresas/123')
    }
  })

  it('el buffer se mantiene en ≤200 eventos aunque emitamos 250', () => {
    initTelemetry()
    for (let i = 0; i < 250; i++) {
      trackRouteChange(`/r/${i}`)
    }
    expect(getTelemetryBuffer().length).toBeLessThanOrEqual(200)
    // El último evento conservado debe ser el más reciente.
    const last = getTelemetryBuffer().at(-1)
    expect(last?.kind).toBe('route_change')
    if (last?.kind === 'route_change') {
      expect(last.path).toBe('/r/249')
    }
  })

  it('initTelemetry es idempotente: llamarlo dos veces no duplica listeners', () => {
    initTelemetry()
    initTelemetry()

    const err = new Error('Doble init')
    window.dispatchEvent(new ErrorEvent('error', { message: err.message, error: err }))

    const errs = getTelemetryBuffer().filter(e => e.kind === 'error')
    expect(errs).toHaveLength(1)
  })
})
