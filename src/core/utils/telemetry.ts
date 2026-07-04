/**
 * Telemetría ligera del CRM (sin SDK externo) — FASE 2, emisor vivo.
 *
 * Registra y ENVÍA a la tabla Supabase `client_telemetry`:
 *  - errores JS no capturados (window.onerror, unhandledrejection)
 *  - crashes de ErrorBoundary (error_boundary)
 *  - respuestas 4xx/5xx y queries lentas >3s de Supabase (supabase_query)
 *  - navegación por página (route_change)
 *  - web vitals lite (LCP, FCP, TTFB)
 *
 * Diseño (aprobado auditoría externa 2026-07-04):
 *  - Batching: flush al llegar a 20 eventos, cada 30s, o en pagehide/hidden
 *    (con fetch keepalive — sendBeacon no permite headers de auth).
 *  - RLS: INSERT exige user_id = auth.uid() → cada fila lleva el user_id del
 *    usuario autenticado y el POST lleva SIEMPRE Authorization: Bearer con el
 *    access_token vigente (snapshot mantenido vía onAuthStateChange; anon no
 *    tiene grants sobre la tabla). Sin sesión → se buffera hasta el login.
 *  - Fire-and-forget: nunca bloquea la UI; 1 reintento máximo por lote.
 *  - Anti-tormenta: dedupe por firma (message+path), máx 5/sesión por firma.
 *  - El wrapper de fetch EXCLUYE las llamadas a client_telemetry (anti-bucle).
 *  - Privacidad RGPD: sin querystrings, sin bodies, stacks truncados a 2KB.
 *  - Solo envía en prod (o con VITE_TELEMETRY_DEV=1). En dev: consola+buffer.
 *
 * Uso desde main.tsx:
 *   import { initTelemetry } from '@/core/utils/telemetry'
 *   initTelemetry()
 */

import { logError } from './logger'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TelemetryEventType =
  | 'error'
  | 'unhandled_rejection'
  | 'error_boundary'
  | 'supabase_query'
  | 'route_change'
  | 'web_vital'
  | 'custom'

interface TelemetryEvent {
  event_type: TelemetryEventType
  payload: Record<string, unknown>
  occurred_at: string // ISO
  /** interno: nº de intentos de envío ya consumidos */
  _retries?: number
}

declare global {
  interface Window {
    __valereTelemetry?: TelemetryEvent[]
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const env = (typeof import.meta !== 'undefined'
  ? (import.meta as unknown as { env?: Record<string, unknown> }).env
  : undefined) ?? {}

const isProd = env.PROD === true
const devSendEnabled = env.VITE_TELEMETRY_DEV === '1'
/** ¿Enviamos de verdad a Supabase? */
const sendEnabled = isProd || devSendEnabled

const SUPABASE_URL = (env.VITE_SUPABASE_URL as string | undefined) ?? ''
const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

const FLUSH_MAX_EVENTS = 20
const FLUSH_INTERVAL_MS = 30_000
const QUEUE_CAP = 200
const STACK_MAX_CHARS = 2_000
const DEDUPE_MAX_PER_SIGNATURE = 5
const SLOW_QUERY_MS = 3_000
const MAX_RETRIES = 1

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

let initialized = false
let queue: TelemetryEvent[] = []
let flushTimer: number | undefined
let flushing = false
const dedupeCounts = new Map<string, number>()

/**
 * Snapshot de auth mantenido VIVO vía onAuthStateChange (dispara en SIGNED_IN,
 * TOKEN_REFRESHED, SIGNED_OUT...). Permite flush síncrono en pagehide sin
 * cachear un token caducado (enmienda E1 de auditoría).
 */
let authSnapshot: { accessToken: string; userId: string } | null = null

function currentPath(): string {
  return typeof window !== 'undefined' ? window.location.pathname : ''
}

function truncate(s: string | undefined, max: number): string | undefined {
  if (s == null) return undefined
  return s.length > max ? `${s.slice(0, max)}…[truncado]` : s
}

function devLog(...args: unknown[]): void {
  if (!isProd) console.debug('[valere-telemetry]', ...args)
}

// ---------------------------------------------------------------------------
// Cola + dedupe
// ---------------------------------------------------------------------------

function signatureOf(type: TelemetryEventType, payload: Record<string, unknown>): string | null {
  // Solo deduplicamos eventos de error (una tormenta de route_change no existe).
  if (type === 'error' || type === 'unhandled_rejection' || type === 'error_boundary' || type === 'supabase_query' || type === 'custom') {
    return `${type}|${String(payload.message ?? payload.label ?? payload.tipo ?? '')}|${String(payload.path ?? '')}|${String(payload.status ?? '')}`
  }
  return null
}

function emit(type: TelemetryEventType, payload: Record<string, unknown>): void {
  const sig = signatureOf(type, payload)
  if (sig) {
    const n = (dedupeCounts.get(sig) ?? 0) + 1
    dedupeCounts.set(sig, n)
    if (n > DEDUPE_MAX_PER_SIGNATURE) return // tormenta: descartamos silenciosamente
  }

  const ev: TelemetryEvent = { event_type: type, payload, occurred_at: new Date().toISOString() }

  // Buffer de debug en window (comportamiento histórico, útil en QA).
  if (typeof window !== 'undefined') {
    window.__valereTelemetry ??= []
    window.__valereTelemetry.push(ev)
    if (window.__valereTelemetry.length > QUEUE_CAP) {
      window.__valereTelemetry.splice(0, window.__valereTelemetry.length - QUEUE_CAP)
    }
  }
  devLog(type, payload)

  if (!sendEnabled) return

  queue.push(ev)
  if (queue.length > QUEUE_CAP) queue.splice(0, queue.length - QUEUE_CAP)
  if (queue.length >= FLUSH_MAX_EVENTS) void flush()
}

// ---------------------------------------------------------------------------
// Flush → INSERT REST directo (soporta keepalive, cosa que supabase-js no)
// ---------------------------------------------------------------------------

async function flush(opts: { keepalive?: boolean } = {}): Promise<void> {
  if (flushing || queue.length === 0 || !sendEnabled) return
  if (!authSnapshot) return // sin sesión la RLS rechazaría el INSERT: seguimos bufereando
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return

  const batch = queue
  queue = []
  flushing = true
  try {
    const rows = batch.map((ev) => ({
      user_id: authSnapshot!.userId,
      event_type: ev.event_type,
      payload: ev.payload,
      occurred_at: ev.occurred_at,
    }))
    const res = await fetch(`${SUPABASE_URL}/rest/v1/client_telemetry`, {
      method: 'POST',
      keepalive: opts.keepalive === true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authSnapshot.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    })
    if (!res.ok) throw new Error(`client_telemetry INSERT → HTTP ${res.status}`)
    devLog(`flush OK (${rows.length} eventos)`)
  } catch (err) {
    devLog('flush FALLIDO', err)
    // Un único reintento por lote en el siguiente flush; después, descarte.
    const retriable = batch
      .filter((ev) => (ev._retries ?? 0) < MAX_RETRIES)
      .map((ev) => ({ ...ev, _retries: (ev._retries ?? 0) + 1 }))
    queue = [...retriable, ...queue].slice(0, QUEUE_CAP)
  } finally {
    flushing = false
  }
}

// ---------------------------------------------------------------------------
// Wrapper de fetch para el cliente Supabase (se inyecta en createClient)
// ---------------------------------------------------------------------------

/** Extrae una etiqueta legible (tabla o función) de una URL de Supabase, sin querystring. */
function labelFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    const m = u.pathname.match(/\/(?:rest\/v1|functions\/v1|auth\/v1|storage\/v1(?:\/object)?)\/([^/?]+)/)
    return m ? m[1] : u.pathname
  } catch {
    return String(rawUrl).split('?')[0]
  }
}

/**
 * Drop-in de fetch que mide duración y reporta 4xx/5xx, errores de red y
 * queries lentas (>3s aunque den 200). Excluye client_telemetry (anti-bucle).
 */
export const telemetryFetch: typeof fetch = async (input, init) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')

  // Anti-bucle: nunca instrumentar la propia tabla de telemetría.
  if (rawUrl.includes('/client_telemetry')) return fetch(input as RequestInfo, init)

  const started = performance.now()
  try {
    const res = await fetch(input as RequestInfo, init)
    const duration = Math.round(performance.now() - started)
    if (res.status >= 400) {
      emit('supabase_query', {
        label: labelFromUrl(rawUrl),
        method,
        status: res.status,
        duration_ms: duration,
        path: currentPath(),
      })
    } else if (duration > SLOW_QUERY_MS) {
      emit('supabase_query', {
        label: labelFromUrl(rawUrl),
        method,
        status: res.status,
        duration_ms: duration,
        slow: true,
        path: currentPath(),
      })
    }
    return res
  } catch (err) {
    emit('supabase_query', {
      label: labelFromUrl(rawUrl),
      method,
      status: 0,
      duration_ms: Math.round(performance.now() - started),
      error: truncate(err instanceof Error ? err.message : String(err), 300),
      path: currentPath(),
    })
    throw err
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export function initTelemetry(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // Suscripción auth (import dinámico para evitar ciclo client.ts ↔ telemetry.ts).
  if (sendEnabled) {
    void import('../supabase/client')
      .then(({ supabase }) => {
        void supabase.auth.getSession().then(({ data }) => {
          authSnapshot = data.session
            ? { accessToken: data.session.access_token, userId: data.session.user.id }
            : null
          if (authSnapshot) void flush()
        })
        supabase.auth.onAuthStateChange((_event, session) => {
          authSnapshot = session
            ? { accessToken: session.access_token, userId: session.user.id }
            : null
        })
      })
      .catch((err) => devLog('no se pudo suscribir a auth', err))

    flushTimer = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS)

    // Flush final al ocultar/cerrar la pestaña, con keepalive.
    const finalFlush = () => void flush({ keepalive: true })
    window.addEventListener('pagehide', finalFlush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') finalFlush()
    })
  }

  // Errores no capturados de JS.
  window.addEventListener('error', (e) => {
    emit('error', {
      message: String(e.message ?? 'unknown error'),
      stack: truncate(e.error instanceof Error ? e.error.stack : undefined, STACK_MAX_CHARS),
      source: e.filename,
      line: e.lineno,
      col: e.colno,
      path: currentPath(),
    })
    logError(e.error ?? e.message, 'window.error')
  })

  // Promise rejections no capturadas.
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason
    emit('unhandled_rejection', {
      message: reason instanceof Error ? reason.message : String(reason ?? 'unknown rejection'),
      stack: truncate(reason instanceof Error ? reason.stack : undefined, STACK_MAX_CHARS),
      path: currentPath(),
    })
    logError(reason, 'window.unhandledrejection')
  })

  // Web vitals "lite" — sin dependencia externa.
  if ('PerformanceObserver' in window) {
    try {
      let lcpValue = 0
      const lcpObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          lcpValue = entry.startTime
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      window.addEventListener('pagehide', () => {
        if (lcpValue > 0) emit('web_vital', { name: 'LCP', value: Math.round(lcpValue) })
      })

      const fcpObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            emit('web_vital', { name: 'FCP', value: Math.round(entry.startTime) })
            fcpObserver.disconnect()
          }
        }
      })
      fcpObserver.observe({ type: 'paint', buffered: true })
    } catch {
      // PerformanceObserver no soportado, ignoramos.
    }
  }

  // TTFB.
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav?.responseStart) {
      emit('web_vital', { name: 'TTFB', value: Math.round(nav.responseStart - nav.requestStart) })
    }
  } catch {
    // Ignorable.
  }
}

/** Marca un cambio de ruta. Lo llama <TelemetryTracker/> en App.tsx. */
export function trackRouteChange(path: string, from?: string): void {
  emit('route_change', from ? { path, from } : { path })
}

/** Reporte desde ErrorBoundary.componentDidCatch. */
export function trackErrorBoundary(error: Error, moduleName?: string): void {
  emit('error_boundary', {
    message: error.message,
    stack: truncate(error.stack, STACK_MAX_CHARS),
    module: moduleName ?? 'desconocido',
    path: currentPath(),
  })
}

/**
 * Evento custom (H5/H6 auditoría de enlaces): rutas no encontradas,
 * entidades no encontradas, y cualquier señal ad-hoc futura.
 * `tipo` viaja dentro del payload; el event_type de la tabla es 'custom'.
 */
export function trackCustom(tipo: string, extra: Record<string, unknown> = {}): void {
  emit('custom', { tipo, path: currentPath(), ...extra })
}

/** Devuelve el buffer actual (debug). */
export function getTelemetryBuffer(): TelemetryEvent[] {
  return typeof window !== 'undefined' ? (window.__valereTelemetry ?? []) : []
}

/** Solo para tests: resetea estado interno. */
export function __resetTelemetryForTests(): void {
  initialized = false
  queue = []
  dedupeCounts.clear()
  authSnapshot = null
  if (flushTimer !== undefined && typeof window !== 'undefined') {
    window.clearInterval(flushTimer)
    flushTimer = undefined
  }
}
