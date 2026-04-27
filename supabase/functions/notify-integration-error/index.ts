// ═══════════════════════════════════════════════════════════════════
// Edge Function: notify-integration-error
// ═══════════════════════════════════════════════════════════════════
//
// Envía email al admin cuando hay errores recientes en la integración
// Holded. Mismo patrón que notify-admin-pending-user (Resend + dominio
// valereconsultores.com verificado).
//
// Disparada de 2 formas:
//   1. Manualmente desde el panel admin (botón "Notificar errores ahora").
//   2. Programada por pg_cron diario (Fase 8 de optimización).
//
// AUTENTICACIÓN
//   verify_jwt=true (default). Valida que el caller sea master.
//
// VARIABLES DE ENTORNO
//   - RESEND_API_KEY (compartido con notify-admin-pending-user)
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
//   - ADMIN_EMAIL (default jolivares@valereconsultores.com)
//   - APP_URL (default https://valere-v2.pages.dev)
//
// SEGURIDAD
//   - Sólo master puede invocar (rechazo 403 a otros roles).
//   - El email NO incluye payloads completos — sólo conteo + ejemplos
//     enmascarados.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'jolivares@valereconsultores.com'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://valere-v2.pages.dev'
const FROM_ADDRESS = 'Valere CRM <noreply@valereconsultores.com>'

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://valere-v2.pages.dev',
]

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

interface ErrorSummary {
  total_errors_24h: number
  total_dead_letter: number
  by_entity: Array<{ entity: string; count: number }>
  recent_examples: Array<{
    ts: string
    entity: string
    http_status: number | null
    error: string | null
  }>
}

function buildEmailHtml(s: ErrorSummary): string {
  const adminUrl = `${APP_URL}/admin?tab=holded`
  const rows = s.by_entity
    .map(
      (b) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(b.entity)}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${b.count}</td></tr>`,
    )
    .join('')

  const examples = s.recent_examples
    .slice(0, 5)
    .map(
      (e) =>
        `<li style="margin-bottom:8px;"><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escapeHtml(e.entity)}</code> · HTTP ${e.http_status ?? '—'} · ${escapeHtml(e.error?.slice(0, 200) ?? '(sin detalle)')}</li>`,
    )
    .join('')

  return `<!doctype html>
<html lang="es">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;color:#991b1b;">⚠️ Errores integración Holded en últimas 24h</h2>
    <p style="margin:0 0 16px;">Resumen automático de la integración.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:white;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;"><td style="padding:8px;color:#64748b;">Errores 24h</td><td style="padding:8px;text-align:right;font-weight:600;">${s.total_errors_24h}</td></tr>
      <tr><td style="padding:8px;color:#64748b;">Dead-letter (no recuperables)</td><td style="padding:8px;text-align:right;font-weight:600;">${s.total_dead_letter}</td></tr>
    </table>
    <h3 style="margin:16px 0 8px;font-size:14px;color:#0f172a;">Por entidad</h3>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;">${rows || '<tr><td style="padding:8px;color:#94a3b8;">Sin desglose</td></tr>'}</table>
    <h3 style="margin:16px 0 8px;font-size:14px;color:#0f172a;">Últimos ejemplos</h3>
    <ul style="padding-left:20px;margin:0 0 16px;font-size:13px;">${examples || '<li>Sin ejemplos</li>'}</ul>
    <p style="margin:24px 0 0;">
      <a href="${adminUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;">Abrir panel Holded</a>
    </p>
  </div>
</body>
</html>`
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY no configurada' }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return { ok: false, error: `Resend ${resp.status} ${text.slice(0, 200)}` }
  }
  return { ok: true }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  // Auth: caller debe ser master. Lo verificamos vía service_role + auth.uid del JWT.
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userToken = authHeader.replace('Bearer ', '')
  const { data: userRes, error: userErr } = await supabase.auth.getUser(userToken)
  if (userErr || !userRes?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, approved')
    .eq('id', userRes.user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'master' || profile.approved !== true) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  // Recolectar resumen
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count: errorCount } = await supabase
    .from('holded_integration_logs')
    .select('*', { count: 'exact', head: true })
    .gte('ts', since)
    .or('http_status.gte.400,http_status.is.null')
    .not('error', 'is', null)

  const { count: deadLetterCount } = await supabase
    .from('holded_sync_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'dead_letter')

  const { data: byEntityRows } = await supabase
    .from('holded_integration_logs')
    .select('entity, http_status, error, ts')
    .gte('ts', since)
    .or('http_status.gte.400,http_status.is.null')
    .not('error', 'is', null)
    .order('ts', { ascending: false })
    .limit(100)

  const byEntityMap = new Map<string, number>()
  for (const r of byEntityRows ?? []) {
    byEntityMap.set(r.entity, (byEntityMap.get(r.entity) ?? 0) + 1)
  }

  const summary: ErrorSummary = {
    total_errors_24h: errorCount ?? 0,
    total_dead_letter: deadLetterCount ?? 0,
    by_entity: [...byEntityMap.entries()].map(([entity, count]) => ({ entity, count })),
    recent_examples: (byEntityRows ?? []).slice(0, 5).map((r) => ({
      ts: r.ts,
      entity: r.entity,
      http_status: r.http_status,
      error: r.error,
    })),
  }

  if (summary.total_errors_24h === 0 && summary.total_dead_letter === 0) {
    return new Response(JSON.stringify({ sent: false, note: 'no_errors_in_window' }), {
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  const html = buildEmailHtml(summary)
  const subject = `Valere CRM · Holded: ${summary.total_errors_24h} errores 24h${summary.total_dead_letter ? ` · ${summary.total_dead_letter} dead-letter` : ''}`
  const send = await sendResendEmail(ADMIN_EMAIL, subject, html)

  if (!send.ok) {
    return new Response(JSON.stringify({ sent: false, error: send.error }), {
      status: 502,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ sent: true, summary }), {
    status: 200,
    headers: { ...cors, 'content-type': 'application/json' },
  })
})
