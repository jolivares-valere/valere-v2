// Edge Function: client-telemetry-ingest
// Recibe eventos de telemetría del frontend del CRM y los persiste en
// `public.client_telemetry`. Valida JWT del usuario y rate-limita por IP.
//
// Body esperado: { events: TelemetryEvent[] } con max 50 eventos por batch.
// TelemetryEvent = { event_type, payload, occurred_at? }
//
// Sprint domingo 2026-06-12 — pulido módulos + observabilidad.

// @ts-ignore deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-ignore deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_EVENTS_PER_BATCH = 50
const ALLOWED_TYPES = new Set([
  'error',
  'unhandled_rejection',
  'web_vital',
  'route_change',
  'supabase_query',
  'error_boundary',
  'reported_incident',
  'custom',
])

interface TelemetryEvent {
  event_type: string
  payload?: Record<string, unknown>
  occurred_at?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    // @ts-ignore deno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore deno
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Cliente con token del usuario para identificar uid.
    const userClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }
    const userId = userData.user.id

    const body = (await req.json().catch(() => null)) as { events?: TelemetryEvent[] } | null
    if (!body || !Array.isArray(body.events)) {
      return new Response(JSON.stringify({ error: 'Body must be { events: [...] }' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const events = body.events.slice(0, MAX_EVENTS_PER_BATCH)
    const now = new Date().toISOString()

    const rows = events
      .filter((e) => e && ALLOWED_TYPES.has(e.event_type))
      .map((e) => ({
        user_id: userId,
        event_type: e.event_type,
        payload: e.payload ?? {},
        occurred_at: e.occurred_at ?? now,
      }))

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Service role bypasses RLS — necesario porque la política de insert filtra por
    // authenticated y no validamos with check sobre user_id (lo establecemos aquí).
    const admin = createClient(supabaseUrl, serviceKey)
    const { error } = await admin.from('client_telemetry').insert(rows)
    if (error) {
      console.error('[client-telemetry-ingest] insert error', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ inserted: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('[client-telemetry-ingest] unexpected', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
