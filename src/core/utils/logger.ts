const isDev =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

export function logError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  if (isDev) {
    console.error(`[Valere] ${context}:`, message, stack ?? '')
    return
  }
  console.error(`[Valere] ${context}:`, message)
}

export function logInfo(message: string, data?: unknown): void {
  if (!isDev) return
  if (data !== undefined) console.info(`[Valere] ${message}`, data)
  else console.info(`[Valere] ${message}`)
}
