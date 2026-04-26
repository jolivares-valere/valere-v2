// ═══════════════════════════════════════════════════════════════════
// Edge Function: notify-user-approval-decision
// ═══════════════════════════════════════════════════════════════════
//
// Disparada desde el panel Admin cuando el master aprueba o rechaza
// una solicitud de alta. Envía un email al usuario afectado.
//
// Caller: master/manager logueado en el CRM (verify_jwt=true).
// La función valida que el caller tenga rol master antes de enviar.
//
// Payload esperado (POST JSON):
//   {
//     "userId": "uuid",          // del usuario afectado
//     "decision": "approved"|"rejected",
//     "userEmail"?: "string",    // opcional, fallback si user ya borrado
//     "userName"?: "string"      // opcional, idem
//   }
//
// Variables de entorno:
//   - RESEND_API_KEY
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - APP_URL (default https://valere-v2.pages.dev)
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

interface RequestBody {
  userId: string
  decision: 'approved' | 'rejected'
  userEmail?: string
  userName?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildApprovedHtml(userName: string): string {
  const name = escapeHtml(userName)
  const url = `${APP_URL}/login`
  return `<!doctype html>
<html lang="es">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <div style="background: #f0fdf4; padding: 24px; border-radius: 12px; border: 1px solid #bbf7d0;">
    <h2 style="margin: 0 0 16px; color: #15803d;">¡Bienvenido a Valere CRM!</h2>
    <p style="margin: 0 0 16px;">Hola ${name || 'compañer@'},</p>
    <p style="margin: 0 0 16px;">Tu cuenta ha sido <strong>aprobada</strong>. Ya puedes acceder con tu email y contraseña.</p>
    <p style="margin: 24px 0 16px;">
      <a href="${url}" style="display: inline-block; background: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Acceder al CRM</a>
    </p>
    <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">Si tienes cualquier problema para entrar, responde a este email.</p>
  </div>
</body>
</html>`
}

function buildRejectedHtml(userName: string): string {
  const name = escapeHtml(userName)
  return `<!doctype html>
<html lang="es">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <div style="background: #fef2f2; padding: 24px; border-radius: 12px; border: 1px solid #fecaca;">
    <h2 style="margin: 0 0 16px; color: #b91c1c;">Solicitud de acceso a Valere CRM</h2>
    <p style="margin: 0 0 16px;">Hola ${name || 'compañer@'},</p>
    <p style="margin: 0 0 16px;">Tu solicitud de acceso al CRM de Valere Consultores no ha sido aprobada en este momento.</p>
    <p style="margin: 0 0 16px;">Si crees que se trata de un error o necesitas más información, puedes responder a este email.</p>
    <p style="margin: 24px 0 0; font-size: 12px; color: #64748b;">Valere Consultores · CRM</p>
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

  // Validar JWT del caller
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
  const { data: callerAuth, error: callerErr } = await supabaseAdmin.auth.getUser(token)
  if (callerErr || !callerAuth?.user) {
    return new Response(JSON.stringify({ error: 'JWT inválido' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Verificar que el caller es master
  const { data: callerProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', callerAuth.user.id)
    .maybeSingle<{ role: string | null }>()

  if (callerProfile?.role !== 'master') {
    return new Response(JSON.stringify({ error: 'Solo el rol master puede notificar decisiones' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Parsear body
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!body.userId || (body.decision !== 'approved' && body.decision !== 'rejected')) {
    return new Response(JSON.stringify({ error: 'Faltan userId o decision (approved|rejected)' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Obtener email/nombre del afectado.
  // Si decision='rejected' la fila puede no existir ya en user_profiles
  // (admin_reject_user borra primero) — por eso aceptamos userEmail/userName en body como fallback.
  let userEmail = body.userEmail ?? null
  let userName = body.userName ?? ''

  if (!userEmail) {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name, nombre, apellidos')
      .eq('id', body.userId)
      .maybeSingle<{ email: string | null; full_name: string | null; nombre: string | null; apellidos: string | null }>()
    if (profile) {
      userEmail = profile.email
      userName = profile.full_name
        ?? `${profile.nombre ?? ''} ${profile.apellidos ?? ''}`.trim()
    }
  }

  if (!userEmail) {
    // Último recurso: leer de auth.users por id
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(body.userId)
    userEmail = authUser?.user?.email ?? null
  }

  if (!userEmail) {
    return new Response(JSON.stringify({ error: 'No se pudo determinar el email del usuario' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const subject = body.decision === 'approved'
    ? '[Valere CRM] Tu cuenta ha sido aprobada'
    : '[Valere CRM] Sobre tu solicitud de acceso'

  const html = body.decision === 'approved'
    ? buildApprovedHtml(userName)
    : buildRejectedHtml(userName)

  const result = await sendResendEmail(userEmail, subject, html)

  if (!result.ok) {
    console.error('[notify-user-approval-decision] Resend error:', result.error)
    return new Response(JSON.stringify({ error: 'Email no enviado', detail: result.error }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, decision: body.decision, to: userEmail }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
