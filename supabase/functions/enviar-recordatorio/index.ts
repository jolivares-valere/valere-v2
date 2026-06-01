// ═══════════════════════════════════════════════════════════════════
// Edge Function: enviar-recordatorio
// ═══════════════════════════════════════════════════════════════════
//
// Sprint 2026-05-19 Hallazgo #2 de Carolina A.
//
// Flujo: el frontend invoca primero `rpc('recordar_a_responsable', ...)`
// que crea notificación CRM + actividad. La RPC devuelve los datos
// (responsable_email, empresa_nombre, etc.) para construir el email.
// El frontend pasa esos datos aquí para que esta función mande el email
// vía Resend.
//
// Provider de email: Resend (https://resend.com)
//
// Variables de entorno necesarias (Supabase secrets):
//   - RESEND_API_KEY        (re_xxx)
//   - SUPABASE_URL          (auto)
//   - SUPABASE_SERVICE_ROLE_KEY (auto)
//   - APP_URL               (opcional, default https://valere-v2.pages.dev)
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

interface RecordatorioInput {
  oportunidad_id: string
  mensaje: string
  responsable_email: string
  responsable_nombre: string | null
  empresa_nombre: string
  emisor_nombre: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildEmailHtml(input: RecordatorioInput): string {
  const empresa = escapeHtml(input.empresa_nombre)
  const responsable = escapeHtml(input.responsable_nombre ?? 'compañero')
  const emisor = escapeHtml(input.emisor_nombre ?? 'Un compañero del equipo')
  const mensaje = escapeHtml(input.mensaje).replace(/\n/g, '<br>')
  const url = `${APP_URL}/captacion?oportunidad=${encodeURIComponent(input.oportunidad_id)}`

  return `<!doctype html>
<html lang="es">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
    <h2 style="margin: 0 0 16px; color: #0f172a;">Recordatorio sobre ${empresa}</h2>
    <p style="margin: 0 0 16px;">Hola ${responsable},</p>
    <p style="margin: 0 0 16px;"><strong>${emisor}</strong> te ha dejado un recordatorio sobre el caso de <strong>${empresa}</strong>:</p>
    <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0; font-style: italic;">
      ${mensaje}
    </div>
    <p style="margin: 24px 0 16px;">
      <a href="${url}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver el caso en el CRM</a>
    </p>
    <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Este recordatorio también ha quedado registrado en el timeline del cliente y en tus notificaciones del CRM.</p>
  </div>
</body>
</html>`
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY no configurada' }
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
      }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return { ok: false, error: `Resend ${resp.status}: ${text}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Falta Authorization Bearer' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'JWT inválido' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: RecordatorioInput
  try {
    body = await req.json() as RecordatorioInput
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Validar input mínimo
  if (!body.oportunidad_id || !body.mensaje || !body.responsable_email || !body.empresa_nombre) {
    return new Response(JSON.stringify({
      error: 'Faltan campos obligatorios: oportunidad_id, mensaje, responsable_email, empresa_nombre',
    }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const subject = `[Valere CRM] Recordatorio sobre ${body.empresa_nombre}`
  const html = buildEmailHtml(body)
  const result = await sendResendEmail(body.responsable_email, subject, html)

  if (!result.ok) {
    console.error('[enviar-recordatorio] Resend error:', result.error)
    return new Response(JSON.stringify({ error: 'Email no enviado', detail: result.error }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
