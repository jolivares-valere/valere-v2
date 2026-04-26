// ═══════════════════════════════════════════════════════════════════
// Edge Function: notify-admin-pending-user
// ═══════════════════════════════════════════════════════════════════
//
// Disparada por el frontend justo después de un signUp exitoso.
// Envía un email al admin (Juan) avisando de que hay una nueva alta
// pendiente de aprobación.
//
// Provider de email: Resend (https://resend.com)
// Plan Free: 100 emails/día, 3000/mes — sobra para signups.
//
// Auth: requiere JWT (verify_jwt=true en config.toml). El usuario
// recién registrado obtiene access_token de supabase.auth.signUp,
// y con ese token llama aquí. Validamos que el caller existe y
// está pendiente antes de enviar el email.
//
// Variables de entorno necesarias (Supabase secrets):
//   - RESEND_API_KEY        (re_xxx — clave de envío Resend)
//   - SUPABASE_URL          (auto)
//   - SUPABASE_SERVICE_ROLE_KEY (auto)
//   - ADMIN_EMAIL           (opcional, default jolivares@valereconsultores.com)
//   - APP_URL               (opcional, default https://valere-v2.pages.dev)
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

interface PendingProfile {
  id: string
  email: string | null
  nombre: string | null
  apellidos: string | null
  full_name: string | null
  approved: boolean | null
  status: string | null
  created_at: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildEmailHtml(profile: PendingProfile): string {
  const nombre = escapeHtml(profile.nombre ?? '')
  const apellidos = escapeHtml(profile.apellidos ?? '')
  const email = escapeHtml(profile.email ?? '(sin email)')
  const fullName = escapeHtml(profile.full_name ?? `${nombre} ${apellidos}`.trim() || '(sin nombre)')
  const fecha = profile.created_at
    ? new Date(profile.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  const adminUrl = `${APP_URL}/admin?tab=pendientes`

  return `<!doctype html>
<html lang="es">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
    <h2 style="margin: 0 0 16px; color: #0f172a;">Nueva alta pendiente en Valere CRM</h2>
    <p style="margin: 0 0 16px;">Alguien acaba de registrarse y está esperando tu aprobación.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; color: #64748b;">Nombre</td><td style="padding: 8px 0; font-weight: 600;">${fullName}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; font-weight: 600;">${email}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Fecha solicitud</td><td style="padding: 8px 0;">${fecha}</td></tr>
    </table>
    <p style="margin: 24px 0 16px;">
      <a href="${adminUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Revisar en Admin</a>
    </p>
    <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Si no apruebas en 7 días, la solicitud se borra automáticamente.</p>
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

  // Validar JWT y extraer caller
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Falta Authorization Bearer' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Cliente con service role para leer user_profiles sin RLS
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Verificar el JWT y obtener el user
  const token = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'JWT inválido' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const userId = userData.user.id

  // Leer el perfil
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, nombre, apellidos, full_name, approved, status, created_at')
    .eq('id', userId)
    .maybeSingle<PendingProfile>()

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: 'Perfil no encontrado' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // No notificar si ya está aprobado (signup repetido o caso raro)
  if (profile.approved === true) {
    return new Response(JSON.stringify({ ok: true, skipped: 'already_approved' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const subject = `[Valere CRM] Nueva alta pendiente: ${profile.email ?? 'sin email'}`
  const html = buildEmailHtml(profile)
  const sendResult = await sendResendEmail(ADMIN_EMAIL, subject, html)

  if (!sendResult.ok) {
    console.error('[notify-admin-pending-user] Resend error:', sendResult.error)
    return new Response(JSON.stringify({ error: 'Email no enviado', detail: sendResult.error }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
