import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/core/utils/cn'

interface Props {
  title?: string
  description?: string
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

/**
 * ErrorState reutilizable — replazo consistente para los bloques "error al cargar X"
 * que cada módulo del CRM venía resolviendo ad-hoc.
 *
 * - Si `error` es Error y NO estamos en prod, muestra el mensaje técnico abajo.
 * - En prod, solo título + descripción genérica.
 * - `onRetry` opcional añade un botón de reintentar (idealmente conectado a refetch()).
 */
export default function ErrorState({
  title = 'No se ha podido cargar la información',
  description = 'Comprueba tu conexión o vuelve a intentarlo. Si el problema persiste, avisa al administrador.',
  error,
  onRetry,
  retrying = false,
  className,
}: Props) {
  const isProd = typeof import.meta !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env?.PROD === true
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : null

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-8 text-center',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
        <AlertTriangle className="w-6 h-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-red-900">{title}</h3>
        <p className="text-sm text-red-800/70 max-w-md">{description}</p>
      </div>
      {!isProd && message && (
        <pre className="text-[11px] text-left bg-white/70 border border-red-200 px-3 py-2 rounded-lg overflow-auto max-h-24 text-red-700 max-w-md w-full">
          {message}
        </pre>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', retrying && 'animate-spin')} aria-hidden />
          {retrying ? 'Reintentando…' : 'Reintentar'}
        </button>
      )}
    </div>
  )
}
