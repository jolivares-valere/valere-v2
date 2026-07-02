// ═══════════════════════════════════════════════════════════════════
// Edge Function: send-password-reset
// ═══════════════════════════════════════════════════════════════════
//
// Envía el correo de "recuperar contraseña" reutilizando Resend (el mismo
// proveedor que ya usan notify-admin-pending-user / notify-user-approval-
// decision), en vez de depender del SMTP por defecto de Supabase.
//
// Flujo:
//   1. Recibe { email }.
//   2. Genera un enlace de recuperación con la Admin API
//      (auth.admin.generateLink type=recovery, redirectTo /reset-password).
//   3. Envía ese enlace por Resend al usuario.
//   4. Devuelve SIEMPRE { ok: true } (no revela si el email existe).
//
// Pública (verify_jwt=false): se llama desde /forgot-password sin sesión.
//
// Variables de entorno:
//   - RESEND_API_KEY            (ya configurada, usada por las notify-*)
//   - SUPABASE_URL             (inyectada)
//   - SUPABASE_SERVICE_ROLE_KEY (inyectada)
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

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function buildResetHtml(link: string): string {
  return `<!doctype html>
<html lang="es">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
    <h2 style="margin: 0 0 16px; color: #1e293b;">Recuperar tu contraseña</h2>
    <p style="margin: 0 0 16px;">Has solicitado restablecer la contraseña de tu cuenta en Valere CRM.</p>
    <p style="margin: 0 0 16px;">Pulsa el botón para elegir una contraseña nueva. El enlace caduca en 1 hora.</p>
    <p style="margin: 24px 0 16px;">
      <a href="${link}" style="display: inline-block; background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Elegir nueva contraseña</a>
    </p>
    <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">Si no has solicitado este cambio, ignora este correo: tu contraseña actual sigue siendo válida.</p>
  </div>
</body>
</html>`
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY no configurada' }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return { ok: false, error: `Resend ${resp.status}: ${text}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch error' }
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405, origin)

  let email = ''
  try {
    const body = await req.json()
    email = String(body.email ?? '').trim().toLowerCase()
  } catch {
    return jsonResponse({ ok: false, error: 'Body JSON inválido' }, 400, origin)
  }

  // Validación mínima de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: 'Email no válido' }, 400, origin)
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Genera el enlace de recuperación. Si el usuario no existe, generateLink
  // devuelve error: NO lo revelamos, respondemos genérico igualmente.
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    })

    const actionLink = data?.properties?.action_link
    if (!error && actionLink) {
      const sent = await sendResendEmail(
        email,
        'Recupera tu contraseña — Valere CRM',
        buildResetHtml(actionLink),
      )
      if (!sent.ok) {
        // Log interno, pero al cliente no le filtramos detalles.
        console.error('[send-password-reset] Resend fallo:', sent.error)
      }
    } else if (error) {
      console.warn('[send-password-reset] generateLink:', error.message)
    }
  } catch (e) {
    console.error('[send-password-reset] error inesperado:', e instanceof Error ? e.message : e)
  }

  // Respuesta genérica siempre (no revela existencia del email).
  return jsonResponse({ ok: true }, 200, origin)
})
