// ═══════════════════════════════════════════════════════════════════
// Edge Function: holded-worker
// ═══════════════════════════════════════════════════════════════════
//
// Invocada por pg_cron cada 5 minutos (vía pg_net en función SQL
// public.holded_dispatch_worker). En Fase 1 NO hace llamadas reales a
// Holded — sólo gestiona el ciclo de vida de la cola
// (holded_sync_queue) marcando items según haya o no handler.
//
// Las Fases siguientes añadirán handlers (catálogos pull en Fase 2,
// contactos bidireccional en Fase 3, etc.).
//
// AUTENTICACIÓN
//   verify_jwt = false en config (es una webhook desde pg_cron).
//   Validamos un header X-Cron-Secret comparado contra el secret
//   HOLDED_CRON_SECRET (Edge Function Secret).
//
// FLUJO
//   1. Validar header X-Cron-Secret.
//   2. Leer holded_config (singleton). Si enabled=false → exit 200 noop.
//   3. SELECT FOR UPDATE SKIP LOCKED hasta WORKER_BATCH items pendientes.
//   4. Por cada item: dispatch a handler o marcar 'skipped_no_handler'
//      (Fase 1 — handlers concretos llegarán en Fases 2+).
//   5. Devolver resumen { processed, skipped, errored }.
//
// SEGURIDAD
//   - Service role key SOLO usada aquí (Deno.env.get).
//   - Si X-Cron-Secret no coincide → 401, sin filtrar info.
//   - Errores genéricos al cliente; detalle a holded_integration_logs.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'
import { getHoldedClient } from '../_shared/holded-client.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const HOLDED_CRON_SECRET = Deno.env.get('HOLDED_CRON_SECRET') ?? ''
const WORKER_BATCH = parseInt(Deno.env.get('HOLDED_WORKER_BATCH') ?? '25', 10)

// CORS no aplica (no hay frontend que llame esto).
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

interface QueueItem {
  id: string
  entity: string
  entity_id: string | null
  action: string
  direction: string
  payload: unknown
  attempts: number
  max_attempts: number
}

interface HandlerResult {
  status: 'done' | 'error' | 'skipped'
  error?: string
}

// ─────────────────────────────────────────────────────────────────
// Handlers — registro de funciones por (entity, action).
// Fase 1: vacío. Las fases siguientes añadirán entries aquí.
// ─────────────────────────────────────────────────────────────────
type HandlerKey = string // `${entity}:${action}`
const handlers = new Map<HandlerKey, (item: QueueItem) => Promise<HandlerResult>>()

// Ejemplo de cómo se registrará en Fase 2 (sólo placeholder, comentado):
// handlers.set('producto:pull', async (item) => { ... })

async function dispatchItem(item: QueueItem): Promise<HandlerResult> {
  const key: HandlerKey = `${item.entity}:${item.action}`
  const handler = handlers.get(key)
  if (!handler) {
    return {
      status: 'skipped',
      error: `no handler for ${key} (Fase 1 worker — handlers llegan en Fase 2+)`,
    }
  }
  try {
    return await handler(item)
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}

serve(async (req) => {
  // 1. Validar secret de cron
  const incomingSecret = req.headers.get('x-cron-secret') ?? ''
  if (!HOLDED_CRON_SECRET || incomingSecret !== HOLDED_CRON_SECRET) {
    return json(401, { error: 'unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 2. Leer config singleton
  const { data: cfg, error: cfgErr } = await supabase
    .from('holded_config')
    .select('enabled, mode')
    .eq('id', 'singleton')
    .maybeSingle()

  if (cfgErr) {
    console.error('[holded-worker] config error', cfgErr.message)
    return json(500, { error: 'config_read_failed' })
  }
  if (!cfg || !cfg.enabled) {
    return json(200, { processed: 0, note: 'integration disabled (holded_config.enabled=false)' })
  }

  // 3. Tomar batch de items pending listos
  const nowIso = new Date().toISOString()
  const { data: items, error: qErr } = await supabase
    .from('holded_sync_queue')
    .select('id, entity, entity_id, action, direction, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(WORKER_BATCH)

  if (qErr) {
    console.error('[holded-worker] queue read error', qErr.message)
    return json(500, { error: 'queue_read_failed' })
  }
  if (!items || items.length === 0) {
    return json(200, { processed: 0 })
  }

  // 4. Marcar como processing (best-effort sin lock distribuido —
  // múltiples invocaciones simultáneas son raras porque pg_cron es 1).
  const ids = items.map((i) => i.id)
  await supabase.from('holded_sync_queue').update({ status: 'processing' }).in('id', ids)

  // 5. Dispatch
  let done = 0, errored = 0, skipped = 0
  for (const item of items as QueueItem[]) {
    const result = await dispatchItem(item)
    const newAttempts = item.attempts + 1
    let newStatus: string
    let scheduledFor: string | null = null

    if (result.status === 'done') {
      newStatus = 'done'
      done += 1
    } else if (result.status === 'skipped') {
      newStatus = 'skipped'
      skipped += 1
    } else {
      // error → reintentar con backoff exponencial si quedan intentos
      if (newAttempts >= item.max_attempts) {
        newStatus = 'dead_letter'
      } else {
        newStatus = 'pending'
        const delaySec = Math.min(1800, Math.pow(2, newAttempts)) // 2,4,8,16,32,64...max 30min
        scheduledFor = new Date(Date.now() + delaySec * 1000).toISOString()
      }
      errored += 1
    }

    await supabase
      .from('holded_sync_queue')
      .update({
        status: newStatus,
        attempts: newAttempts,
        last_error: result.error ?? null,
        processed_at: result.status === 'done' || result.status === 'skipped'
          ? new Date().toISOString()
          : null,
        scheduled_for: scheduledFor ?? new Date(Date.now() - 1000).toISOString(),
      })
      .eq('id', item.id)
  }

  // 6. Touch del cliente Holded para asegurar que la API key está OK
  // (sólo en mode=live y si hay handlers ejecutados — Fase 1 lo skipea).
  void getHoldedClient()

  return json(200, { processed: items.length, done, skipped, errored })
})
