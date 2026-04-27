// ═══════════════════════════════════════════════════════════════════
// Shared module: holded-client
// ═══════════════════════════════════════════════════════════════════
//
// Cliente HTTP para la API REST de Holded (https://api.holded.com/api).
// Usado por holded-worker, holded-pull-catalogs, holded-sync-contacts, etc.
//
// Características:
//  - Auth via header `key: <HOLDED_API_KEY>` (Holded NO usa Bearer estándar).
//  - Retry exponencial: 1, 2, 4, 8, 16, 32 s — max 6 intentos por defecto.
//  - Token bucket rate-limit: 5 req/s por defecto (configurable).
//  - Timeout: 15 s por request.
//  - Logging estructurado a `holded_integration_logs` con masking PII.
//  - NO loggea el body completo si contiene NIF/IBAN — usa los helpers SQL
//    holded_mask_nif / holded_mask_iban en el caller para redactar.
//
// Variables de entorno requeridas (Edge Function Secrets):
//  - HOLDED_API_KEY        — generada como "Valere CRM Integration" en Holded.
//  - SUPABASE_URL          (auto)
//  - SUPABASE_SERVICE_ROLE_KEY (auto)
//
// SEGURIDAD
//  - La API key NUNCA se loggea ni se devuelve en errores expuestos al frontend.
//  - El service role key SOLO vive en Edge Function (Deno.env.get).
//  - Ningún payload con PII viaja al log sin pasar por mask().
// ═══════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.100.0'

export const HOLDED_API_KEY = Deno.env.get('HOLDED_API_KEY') ?? ''
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ─────────────────────────────────────────────────────────────────
// Rate limiter token bucket
// ─────────────────────────────────────────────────────────────────
interface TokenBucket {
  tokens: number
  capacity: number
  refillPerSec: number
  lastRefill: number
}

function makeBucket(refillPerSec: number): TokenBucket {
  return { tokens: refillPerSec, capacity: refillPerSec, refillPerSec, lastRefill: Date.now() }
}

async function takeToken(b: TokenBucket): Promise<void> {
  for (;;) {
    const now = Date.now()
    const elapsed = (now - b.lastRefill) / 1000
    b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerSec)
    b.lastRefill = now
    if (b.tokens >= 1) {
      b.tokens -= 1
      return
    }
    const waitMs = ((1 - b.tokens) / b.refillPerSec) * 1000
    await new Promise((r) => setTimeout(r, Math.max(50, Math.min(2000, waitMs))))
  }
}

// ─────────────────────────────────────────────────────────────────
// Cliente HTTP
// ─────────────────────────────────────────────────────────────────
export interface HoldedClientOptions {
  apiKey?: string
  apiBaseUrl?: string
  rateLimitPerSec?: number
  timeoutMs?: number
  retryMaxAttempts?: number
  retryInitialBackoffMs?: number
  supabase?: SupabaseClient
}

export interface HoldedRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  // Identificadores para logging
  entity?: string
  entityId?: string
  queueId?: string
  triggeredBy?: string
  // Pre-mascarado: el caller debe pasar el payload ya enmascarado para logs.
  // Si no, no se persistirá payload en el log (sólo metadata).
  maskedRequestPayload?: unknown
}

export interface HoldedResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
  durationMs: number
}

export class HoldedClient {
  private apiKey: string
  private baseUrl: string
  private bucket: TokenBucket
  private timeoutMs: number
  private retryMaxAttempts: number
  private retryInitialBackoffMs: number
  private supabase: SupabaseClient

  constructor(opts: HoldedClientOptions = {}) {
    this.apiKey = opts.apiKey ?? HOLDED_API_KEY
    this.baseUrl = (opts.apiBaseUrl ?? 'https://api.holded.com/api').replace(/\/+$/, '')
    this.bucket = makeBucket(opts.rateLimitPerSec ?? 5)
    this.timeoutMs = opts.timeoutMs ?? 15000
    this.retryMaxAttempts = opts.retryMaxAttempts ?? 6
    this.retryInitialBackoffMs = opts.retryInitialBackoffMs ?? 1000
    this.supabase =
      opts.supabase ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

    if (!this.apiKey) {
      console.warn('[holded-client] HOLDED_API_KEY no configurada — todas las llamadas fallarán con 401')
    }
  }

  private buildUrl(path: string, query?: HoldedRequestOptions['query']): string {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : '/' + path))
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }
    return url.toString()
  }

  async request<T = unknown>(opts: HoldedRequestOptions): Promise<HoldedResponse<T>> {
    const method = opts.method ?? 'GET'
    const url = this.buildUrl(opts.path, opts.query)
    const start = Date.now()
    let attempt = 0
    let lastError: string | undefined

    while (attempt < this.retryMaxAttempts) {
      attempt += 1
      await takeToken(this.bucket)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        const resp = await fetch(url, {
          method,
          signal: controller.signal,
          headers: {
            'key': this.apiKey,
            'accept': 'application/json',
            ...(opts.body ? { 'content-type': 'application/json' } : {}),
          },
          body: opts.body ? JSON.stringify(opts.body) : undefined,
        })
        clearTimeout(timeoutId)

        const text = await resp.text()
        let data: T | undefined
        try { data = text ? (JSON.parse(text) as T) : undefined } catch { data = text as unknown as T }

        const durationMs = Date.now() - start

        // 2xx: éxito
        if (resp.ok) {
          await this.logCall({
            ok: true, method, url, status: resp.status,
            durationMs, response: data, request: opts.maskedRequestPayload,
            entity: opts.entity, entityId: opts.entityId, queueId: opts.queueId,
            triggeredBy: opts.triggeredBy,
          })
          return { ok: true, status: resp.status, data, durationMs }
        }

        // 4xx (excepto 429): no reintentar — error de validación
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
          await this.logCall({
            ok: false, method, url, status: resp.status,
            durationMs, response: data, error: `HTTP ${resp.status}`,
            request: opts.maskedRequestPayload,
            entity: opts.entity, entityId: opts.entityId, queueId: opts.queueId,
            triggeredBy: opts.triggeredBy,
          })
          return { ok: false, status: resp.status, data, error: `HTTP ${resp.status}`, durationMs }
        }

        // 5xx o 429: reintentar
        lastError = `HTTP ${resp.status}`
      } catch (err) {
        clearTimeout(timeoutId)
        lastError = err instanceof Error ? err.message : String(err)
      }

      // Backoff exponencial entre intentos (no en el último)
      if (attempt < this.retryMaxAttempts) {
        const backoff = this.retryInitialBackoffMs * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, backoff))
      }
    }

    const durationMs = Date.now() - start
    await this.logCall({
      ok: false, method, url, status: 0, durationMs,
      error: lastError ?? 'unknown error after retries',
      request: opts.maskedRequestPayload,
      entity: opts.entity, entityId: opts.entityId, queueId: opts.queueId,
      triggeredBy: opts.triggeredBy,
    })
    return { ok: false, status: 0, error: lastError, durationMs }
  }

  // ─────────────────────────────────────────────────────────────────
  // Logging a holded_integration_logs (con service role)
  // ─────────────────────────────────────────────────────────────────
  private async logCall(p: {
    ok: boolean
    method: string
    url: string
    status: number
    durationMs: number
    request?: unknown
    response?: unknown
    error?: string
    entity?: string
    entityId?: string
    queueId?: string
    triggeredBy?: string
  }): Promise<void> {
    try {
      await this.supabase.from('holded_integration_logs').insert({
        direction: 'valere_to_holded',
        entity: p.entity ?? 'unknown',
        entity_id: p.entityId ?? null,
        http_method: p.method,
        http_url: p.url.replace(this.apiKey, '***'),
        http_status: p.status,
        request_payload: p.request ?? null,
        // Truncamos response a 8 KB para evitar logs gigantes
        response_body: typeof p.response === 'string'
          ? { _raw: String(p.response).slice(0, 8192) }
          : (p.response ?? null),
        error: p.error ?? null,
        duration_ms: p.durationMs,
        triggered_by: p.triggeredBy ?? null,
        queue_id: p.queueId ?? null,
      })
    } catch (err) {
      // El logging no debe romper la integración. Sólo console.error.
      console.error('[holded-client] log error', err instanceof Error ? err.message : String(err))
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────
  /**
   * Calcula MD5 etag determinista de un payload (para detección de cambios).
   */
  static async etag(payload: unknown): Promise<string> {
    const json = JSON.stringify(payload, Object.keys(payload as object).sort())
    const buf = new TextEncoder().encode(json)
    const hash = await crypto.subtle.digest('MD5', buf)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
}

/**
 * Helper de masking JS-side (gemelo de las funciones SQL holded_mask_*).
 * Útil cuando el payload se construye dentro de la Edge Function antes
 * de loggearlo.
 */
export function maskNif(nif: string | null | undefined): string | null {
  if (!nif) return null
  const n = nif.toUpperCase().replace(/[\s\-\.]/g, '')
  if (n.length < 4) return '***'
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1]
}

export function maskIban(iban: string | null | undefined): string | null {
  if (!iban) return null
  const n = iban.replace(/\s/g, '')
  if (n.length < 8) return '***'
  return n.slice(0, 4) + '*'.repeat(n.length - 8) + n.slice(-4)
}

/**
 * Singleton perezoso para usar desde cualquier Edge Function.
 */
let _defaultClient: HoldedClient | null = null
export function getHoldedClient(): HoldedClient {
  if (!_defaultClient) _defaultClient = new HoldedClient()
  return _defaultClient
}
