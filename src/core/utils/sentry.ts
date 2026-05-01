/**
 * Sentry — wrapper de inicialización lazy.
 *
 * Si `VITE_SENTRY_DSN` no está definido (caso por defecto en local), no se
 * carga el SDK ni se envían eventos: el bundle ni siquiera incluye `@sentry/react`
 * si el entorno no lo configura.
 *
 * Uso:
 *   import { initSentry, captureException, getReactErrorHandler } from './sentry'
 *
 *   // En main.tsx, antes de createRoot:
 *   await initSentry()
 *   ReactDOM.createRoot(root, {
 *     onUncaughtError: getReactErrorHandler(),
 *     onRecoverableError: getReactErrorHandler(),
 *   }).render(...)
 *
 *   // En core/utils/logger.ts: logError reenvía a captureException(err, ctx)
 *
 * FASE 30.10 — Auditoría 2026-05-01.
 */

type SentryModule = typeof import('@sentry/react')

let sentryRef: SentryModule | null = null
let initPromise: Promise<void> | null = null

function getDsn(): string | undefined {
  if (typeof import.meta === 'undefined') return undefined
  const env = (import.meta as { env?: Record<string, string | undefined> }).env
  return env?.VITE_SENTRY_DSN
}

function getEnvironment(): string {
  if (typeof import.meta === 'undefined') return 'unknown'
  const env = (import.meta as { env?: Record<string, string | undefined> }).env
  return env?.VITE_SENTRY_ENVIRONMENT ?? (env?.DEV ? 'development' : 'production')
}

export function isSentryEnabled(): boolean {
  return Boolean(getDsn())
}

/**
 * Carga `@sentry/react` dinámicamente y lo inicializa. Idempotente.
 * Si no hay DSN configurado, devuelve sin hacer nada (no carga el SDK).
 */
export async function initSentry(): Promise<void> {
  if (initPromise) return initPromise
  const dsn = getDsn()
  if (!dsn) return Promise.resolve()
  initPromise = (async () => {
    try {
      const Sentry = await import('@sentry/react')
      Sentry.init({
        dsn,
        environment: getEnvironment(),
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0,
        // Filtra errores de extensiones del navegador y ResizeObserver no críticos.
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          /chrome-extension/,
          /moz-extension/,
        ],
      })
      sentryRef = Sentry
    } catch (e) {
      // No bloquear la app si Sentry falla en cargar
      // eslint-disable-next-line no-console
      console.warn('[Valere] Sentry init failed:', e)
    }
  })()
  return initPromise
}

/**
 * Reporta una excepción a Sentry si está disponible. No-op si no.
 * Llamar desde `logError` para mantener un único punto de entrada.
 */
export function captureException(error: unknown, context?: string): void {
  if (!sentryRef) return
  try {
    sentryRef.captureException(error, context ? { tags: { context } } : undefined)
  } catch {
    // ignore
  }
}

/**
 * Devuelve el callback de error para createRoot/hydrateRoot de React 19.
 * Si Sentry no está cargado, devuelve un no-op.
 */
export function getReactErrorHandler(): ((error: unknown, errorInfo: { componentStack?: string }) => void) | undefined {
  if (!sentryRef) return undefined
  return sentryRef.reactErrorHandler()
}

/**
 * Asocia el usuario autenticado a los eventos. Llamar tras login.
 */
export function setSentryUser(user: { id: string; email?: string | null } | null): void {
  if (!sentryRef) return
  try {
    if (user) sentryRef.setUser({ id: user.id, email: user.email ?? undefined })
    else sentryRef.setUser(null)
  } catch {
    // ignore
  }
}
