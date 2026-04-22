const isDev =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts: string[] = []
    if (typeof e.message === 'string') parts.push(e.message)
    if (typeof e.code === 'string') parts.push(`[${e.code}]`)
    if (typeof e.details === 'string') parts.push(`details=${e.details}`)
    if (typeof e.hint === 'string') parts.push(`hint=${e.hint}`)
    if (parts.length > 0) return parts.join(' ')
    try { return JSON.stringify(error) } catch { return String(error) }
  }
  return String(error)
}

export function logError(error: unknown, context: string): void {
  const message = serializeError(error)
  const stack = error instanceof Error ? error.stack : undefined
  if (isDev) {
    console.error(`[Valere] ${context}:`, message, error, stack ?? '')
    return
  }
  console.error(`[Valere] ${context}:`, message)
}

export function logInfo(message: string, data?: unknown): void {
  if (!isDev) return
  if (data !== undefined) console.info(`[Valere] ${message}`, data)
  else console.info(`[Valere] ${message}`)
}
