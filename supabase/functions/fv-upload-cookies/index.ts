/**
 * Edge Function: fv-upload-cookies
 *
 * Recibe el storage state (cookies) extraido por el Renovador local, lo cifra
 * server-side (AES-256-GCM) y lo escribe en fv_credenciales_secret. Asi el PC
 * del usuario NUNCA tiene la FV_ENCRYPTION_KEY ni la SERVICE_ROLE_KEY.
 *
 * Espejo de seguridad de fv-create-credential:
 *   - Valida JWT + rol admin/master.
 *   - Cifra server-side con FV_ENCRYPTION_KEY (misma clave que el conector Python).
 *   - Escribe en fv_credenciales_secret via service_role (bypass RLS).
 *   - Limpia ultimo_error y pone estado_sesion='activa' en fv_credenciales.
 *   - No loguea cookies ni valores sensibles.
 *
 * POST /functions/v1/fv-upload-cookies
 * Body: { credencial_id: string, storage_state: object, dias_validez?: number }
 *   storage_state = dict de Playwright { cookies: [...], origins: [...] }
 *
 * Respuestas:
 *   200 { ok: true, cookies_expires_at }
 *   400 body invalido | 401 no auth | 403 no admin | 404 credencial no existe | 500
 *
 * Env vars: FV_ENCRYPTION_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// AES-256-GCM identico a fv-create-credential / conector Python.
// Formato: "AES256GCM:v1:<iv_b64>:<ciphertext+tag_b64>"
async function encryptSecret(plaintext: string, keyB64: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0))
  if (keyBytes.length !== 32) {
    throw new Error('FV_ENCRYPTION_KEY debe ser exactamente 32 bytes en base64')
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, new TextEncoder().encode(plaintext))
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `AES256GCM:v1:${ivB64}:${ctB64}`
}

async function verificarAdmin(sbUser: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await sbUser.from('user_profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin' || data?.role === 'master'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401)

    // 2. Verificar JWT
    const sbUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await sbUser.auth.getUser()
    if (authError || !user) return json({ error: 'Sesion invalida o expirada' }, 401)

    // 3. Rol admin/master
    if (!(await verificarAdmin(sbUser, user.id))) {
      return json({ error: 'Solo administradores pueden renovar sesiones FV' }, 403)
    }

    // 4. Body
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return json({ error: 'Body JSON invalido' }, 400)
    const { credencial_id, storage_state, dias_validez } = body as {
      credencial_id?: string; storage_state?: unknown; dias_validez?: number
    }
    if (!credencial_id) return json({ error: 'credencial_id requerido' }, 400)
    if (!storage_state || typeof storage_state !== 'object') {
      return json({ error: 'storage_state requerido (objeto Playwright)' }, 400)
    }
    // Validacion minima: debe tener cookies
    const cookies = (storage_state as { cookies?: unknown }).cookies
    if (!Array.isArray(cookies) || cookies.length === 0) {
      return json({ error: 'storage_state sin cookies — el login no se completo' }, 400)
    }

    // 5. Clave de cifrado
    const encKey = Deno.env.get('FV_ENCRYPTION_KEY')
    if (!encKey) return json({ error: 'FV_ENCRYPTION_KEY no configurada en el servidor' }, 500)

    // 6. Cliente service_role
    const sbAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 7. La fila de secreto debe existir (la crea fv-create-credential con password_enc NOT NULL).
    const { data: secretRow, error: secErr } = await sbAdmin
      .from('fv_credenciales_secret').select('credencial_id').eq('credencial_id', credencial_id).single()
    if (secErr || !secretRow) {
      return json({ error: 'Esta credencial no tiene registro de secreto. Vuelve a crear la credencial en el CRM.' }, 404)
    }

    // 8. Cifrar el storage state server-side
    const stateEnc = await encryptSecret(JSON.stringify(storage_state), encKey)

    // 9. Fechas
    const dias = (typeof dias_validez === 'number' && dias_validez > 0 && dias_validez <= 60) ? dias_validez : 7
    const now = new Date()
    const expires = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000)

    // 10. UPDATE (no upsert): la fila existe y password_enc es NOT NULL.
    //     Un upsert intentaba INSERT sin password_enc -> 23502.
    const { error: secretErr } = await sbAdmin
      .from('fv_credenciales_secret')
      .update({
        session_cookies:    stateEnc,
        cookies_expires_at: expires.toISOString(),
        cookies_updated_at: now.toISOString(),
      })
      .eq('credencial_id', credencial_id)
    if (secretErr) {
      console.error('Error al escribir fv_credenciales_secret:', secretErr.code)
      return json({ error: 'No se pudieron guardar las cookies. Intentalo de nuevo.' }, 500)
    }

    // 11. Limpiar estado operativo en fv_credenciales
    const { error: pubErr } = await sbAdmin
      .from('fv_credenciales')
      .update({ ultimo_error: null, estado_sesion: 'activa', cookies_expires_at: expires.toISOString() })
      .eq('id', credencial_id)
    if (pubErr) {
      console.error('Error al actualizar estado fv_credenciales:', pubErr.code)
      // No es critico: las cookies ya estan guardadas
    }

    return json({ ok: true, cookies_expires_at: expires.toISOString() })

  } catch (err) {
    console.error('fv-upload-cookies error:', err instanceof Error ? err.message : 'unknown')
    return json({ error: 'Error interno del servidor' }, 500)
  }
})
