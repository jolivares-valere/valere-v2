/**
 * Telemetría ligera del CRM (sin SDK externo).
 *
 * Registra:
 *  - errores no capturados (window.onerror, unhandledrejection)
 *  - métricas de navegación (first paint, LCP, TTI aproximado)
 *  - duración de fetch a Supabase Edge Functions (vía wrapper opcional)
 *
 * El destino por defecto es la consola en dev y Supabase en prod (tabla
 * `crm_telemetry` — pendiente de crear). Mientras la tabla no exista, los
 * eventos se acumulan en `window.__valereTelemetry` y se descartan al
 * cerrar la pestaña, lo cual ya es útil para debug en QA.
 *
 * Uso desde main.tsx:
 *   import { initTelemetry } from '@/core/utils/telemetry'
 *   initTelemetry()
 *
 * Sprint paralelo B (frontend) — 2026-04-25.
 */

import { logError } from './logger'

type TelemetryEvent =
  | { kind: 'error'; message: string; stack?: string; source?: string; line?: number; col?: number; ts: number }
  | { kind: 'unhandled_rejection'; message: string; stack?: string; ts: number }
  | { kind: 'web_vital'; name: 'LCP' | 'FCP' | 'TTFB' | 'CLS'; value: number; ts: number }
  | { kind: 'route_change'; path: string; ts: number }

declare global {
  interface Window {
    __valereTelemetry?: TelemetryEvent[]
  }
}

const isProd = typeof import.meta !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env?.PROD === true

function emit(ev: TelemetryEvent): void {
  // Buffer en memoria — útil para debug en consola (`window.__valereTelemetry`).
  if (typeof window !== 'undefined') {
    window.__valereTelemetry ??= []
    window.__valereTelemetry.push(ev)
    if (window.__valereTelemetry.length > 200) {
      // No queremos crecer sin límite. Mantenemos los últimos 200 eventos.
      window.__valereTelemetry.splice(0, window.__valereTelemetry.length - 200)
    }
  }
  if (!isProd) {
    // En dev, emite a consola con prefijo identificable.

    console.debug('[valere-telemetry]', ev)
  }
  // En prod, cuando exista la tabla `crm_telemetry`, este es el punto donde
  // haríamos un fire-and-forget POST a una Edge Function `track-event`.
  // De momento no hay infra: lo dejamos en buffer.
}

let initialized = false

export function initTelemetry(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // Errores no capturados de JS.
  window.addEventListener('error', (e) => {
    emit({
      kind: 'error',
      message: String(e.message ?? 'unknown error'),
      stack: e.error instanceof Error ? e.error.stack : undefined,
      source: e.filename,
      line: e.lineno,
      col: e.colno,
      ts: Date.now(),
    })
    logError(e.error ?? e.message, 'window.error')
  })

  // Promise rejections no capturadas.
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason
    emit({
      kind: 'unhandled_rejection',
      message: reason instanceof Error ? reason.message : String(reason ?? 'unknown rejection'),
      stack: reason instanceof Error ? reason.stack : undefined,
      ts: Date.now(),
    })
    logError(reason, 'window.unhandledrejection')
  })

  // Web vitals "lite" — sin dependencia externa (web-vitals añade ~6 KB).
  // Con PerformanceObserver bastan LCP y FCP, que son los más útiles para diagnóstico.
  if ('PerformanceObserver' in window) {
    try {
      // LCP — dispara cada vez que aparece un nuevo "largest contentful paint" candidato.
      // Nos quedamos con el último (que es el oficial al cerrar la página).
      let lcpValue = 0
      const lcpObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          lcpValue = entry.startTime
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      window.addEventListener('pagehide', () => {
        if (lcpValue > 0) emit({ kind: 'web_vital', name: 'LCP', value: Math.round(lcpValue), ts: Date.now() })
      })

      // FCP — disparo único.
      const fcpObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            emit({ kind: 'web_vital', name: 'FCP', value: Math.round(entry.startTime), ts: Date.now() })
            fcpObserver.disconnect()
          }
        }
      })
      fcpObserver.observe({ type: 'paint', buffered: true })
    } catch {
      // PerformanceObserver no soportado, ignoramos.
    }
  }

  // TTFB desde performance.timing.
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav?.responseStart) {
      emit({ kind: 'web_vital', name: 'TTFB', value: Math.round(nav.responseStart - nav.requestStart), ts: Date.now() })
    }
  } catch {
    // Ignorable.
  }
}

/**
 * Marca un cambio de ruta. Llamar desde un useEffect que dependa de location.pathname.
 * Útil en el futuro para correlacionar errores con la ruta donde ocurrieron.
 */
export function trackRouteChange(path: string): void {
  emit({ kind: 'route_change', path, ts: Date.now() })
}

/** Devuelve el buffer actual (debug). */
export function getTelemetryBuffer(): TelemetryEvent[] {
  return typeof window !== 'undefined' ? (window.__valereTelemetry ?? []) : []
}

/**
 * Reset interno SOLO para tests — limpia el buffer y rearma `initialized`.
 * No exportar/usar fuera de archivos `*.test.ts`.
 */
export function __resetTelemetryForTests(): void {
  initialized = false
  if (typeof window !== 'undefined') {
    window.__valereTelemetry = []
  }
}
