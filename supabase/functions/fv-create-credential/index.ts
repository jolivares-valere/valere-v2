/**
 * Edge Function: fv-create-credential
 *
 * MODELO DE SEGURIDAD:
 *   - Valida JWT + rol admin/master antes de operar
 *   - Cifra password con AES-256-GCM server-side (FV_ENCRYPTION_KEY)
 *   - Escribe en DOS tablas:
 *       fv_credenciales        -> datos operativos (sin secretos)
 *       fv_credenciales_secret -> password_enc + session_cookies (solo service_role)
 *   - Devuelve SOLO datos de fv_credenciales (nunca secretos)
 *   - No loguea username ni password (solo IDs y errores de sistema)
 *
 * FIX 2026-06-15 (guardado de credenciales):
 *   - Normaliza region_url server-side (nunca NULL): si va vacio -> URL por
 *     defecto de la plataforma. Elimina el comportamiento erratico.
 *   - Chequeo informativo de duplicado exacto (plataforma, username,
 *     region_url, nombre) -> 409 con mensaje claro, en vez de chocar con la
 *     constraint y devolver "Error interno".
 *   - Propaga el error real al cliente (mensaje util en el toast).
 *
 * Env vars requeridas:
 *   FV_ENCRYPTION_KEY         - 32 bytes base64 (misma clave que el conector Python)
 *   SUPABASE_URL              - auto-inyectada por Supabase
 *   SUPABASE_ANON_KEY         - auto-inyectada por Supabase
 *   SUPABASE_SERVICE_ROLE_KEY - auto-inyectada por Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URLs por defecto por plataforma (espejo de PLATAFORMAS en CredencialFormModal.tsx)
const URL_DEFAULTS: Record<string, string> = {
  fusionsolar: 'https://uni003eu5.fusionsolar.huawei.com',
  goodwe:      'https://www.semsportal.com',
  isolarcloud: 'https://www.isolarcloud.com',
  sma_ennexos: 'https://ennexos.sunnyportal.com',
  solaredge:   'https://monitoring.solaredge.com',
  otro:        '',
}

/** Normaliza region_url: nunca devuelve null si hay default conocido para la plataforma. */
function normalizarRegionUrl(plataforma: string, region_url: unknown): string | null {
  const raw = typeof region_url === 'string' ? region_url.trim() : ''
  if (raw) return raw
  const def = URL_DEFAULTS[plataforma]
  return def ? def : null   // 'otro' sin default puede quedar null legitimamente
}

// AES-256-GCM (compatible con el conector Python)
// Python: AESGCM(key).encrypt(iv, plaintext, None)
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

// Verificar rol admin/master usando el JWT del usuario
async function verificarAdmin(supabaseUser: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabaseUser
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role === 'admin' || data?.role === 'master'
}

function errorResponse(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Rechazar llamadas sin Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('No autorizado', 401)

    // 2. Verificar JWT y obtener usuario
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return errorResponse('Sesion invalida o expirada', 401)

    // 3. Comprobar rol admin/master
    const esAdmin = await verificarAdmin(supabaseUser, user.id)
    if (!esAdmin) return errorResponse('Solo administradores pueden gestionar credenciales FV', 403)

    // 4. Parsear body (sin loguear datos sensibles)
    const body = await req.json()
    const { action, id, plataforma, nombre, username, password, region_url, activo, tipo, descripcion } = body

    if (!['create', 'update'].includes(action)) {
      return errorResponse('Accion no valida. Usa: create | update', 400)
    }

    // 5. Obtener clave de cifrado
    const encKey = Deno.env.get('FV_ENCRYPTION_KEY')
    if (!encKey) return errorResponse('FV_ENCRYPTION_KEY no configurada en el servidor', 500)

    // 6. Cifrar contrasena si se proporciona
    let password_enc: string | undefined
    if (password) {
      password_enc = await encryptSecret(password, encKey)
      // NO logueamos password, username ni password_enc
    }

    // 7. Cliente service_role para escritura en tablas (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: create
    // ─────────────────────────────────────────────────────────────────────
    if (action === 'create') {
      if (!plataforma || !username || !password) {
        return errorResponse('plataforma, username y password son obligatorios', 400)
      }

      const regionUrlNorm = normalizarRegionUrl(plataforma, region_url)
      const nombreFinal = nombre || username

      // Chequeo informativo de duplicado exacto (no constraint rigida):
      // misma plataforma + mismo username + misma region_url + mismo nombre.
      // Permite reutilizar el mismo login instalador con nombres distintos.
      let dupQuery = supabaseAdmin
        .from('fv_credenciales')
        .select('id')
        .eq('plataforma', plataforma)
        .eq('username', username)
        .eq('nombre', nombreFinal)
        .limit(1)
      dupQuery = regionUrlNorm === null
        ? dupQuery.is('region_url', null)
        : dupQuery.eq('region_url', regionUrlNorm)

      const { data: dup, error: dupError } = await dupQuery
      if (dupError) {
        console.error('Error al comprobar duplicado fv_credenciales:', dupError.code)
        throw dupError
      }
      if (dup && dup.length > 0) {
        return errorResponse(
          'Ya existe una credencial con ese nombre para ese usuario y portal. Cambia el nombre descriptivo para distinguirla.',
          409,
        )
      }

      // Escribir datos operativos en fv_credenciales (sin secretos)
      const { data: cred, error: credError } = await supabaseAdmin
        .from('fv_credenciales')
        .insert({
          plataforma,
          nombre:      nombreFinal,
          username,                           // solo el username, no la password
          region_url:  regionUrlNorm,
          activo:      activo ?? true,
          tipo:        tipo || 'instalador_multicliente',
          descripcion: descripcion || null,
        })
        .select('id, plataforma, nombre, username_masked, region_url, activo, tipo, descripcion')
        .single()

      if (credError) {
        console.error('Error al crear fv_credenciales:', credError.code, credError.hint)
        // Propagar mensaje util al cliente (sin datos sensibles)
        if (credError.code === '23505') {
          return errorResponse('Ya existe una credencial identica. Cambia el nombre para distinguirla.', 409)
        }
        return errorResponse('No se pudo guardar la credencial: ' + (credError.message || credError.code), 400)
      }

      // Escribir secretos en fv_credenciales_secret (tabla separada, solo service_role)
      const { error: secretError } = await supabaseAdmin
        .from('fv_credenciales_secret')
        .insert({
          credencial_id: cred.id,
          password_enc:  password_enc!,
        })

      if (secretError) {
        // Rollback: borrar la credencial recien creada para evitar datos huerfanos
        await supabaseAdmin.from('fv_credenciales').delete().eq('id', cred.id)
        console.error('Error al crear fv_credenciales_secret:', secretError.code)
        return errorResponse('No se pudo guardar el secreto de la credencial. Intentalo de nuevo.', 500)
      }

      // Devolver solo datos seguros - NUNCA los secretos
      return new Response(JSON.stringify({ ok: true, credencial: cred }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTION: update
    // ─────────────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id) return errorResponse('id requerido para actualizar', 400)

      // Actualizar datos operativos (sin secretos)
      const updatesPublic: Record<string, unknown> = {}
      if (nombre      !== undefined) updatesPublic.nombre      = nombre
      if (activo      !== undefined) updatesPublic.activo      = activo
      if (descripcion !== undefined) updatesPublic.descripcion = descripcion
      if (region_url  !== undefined) {
        // Normalizar tambien en update: nunca dejar cadena vacia -> default plataforma
        // (necesitamos la plataforma de la fila actual si no viene en el body)
        let plataformaActual = plataforma
        if (!plataformaActual) {
          const { data: rowPlat } = await supabaseAdmin
            .from('fv_credenciales').select('plataforma').eq('id', id).single()
          plataformaActual = rowPlat?.plataforma
        }
        updatesPublic.region_url = normalizarRegionUrl(plataformaActual ?? '', region_url)
      }

      let credData = null
      if (Object.keys(updatesPublic).length > 0) {
        const { data, error } = await supabaseAdmin
          .from('fv_credenciales')
          .update(updatesPublic)
          .eq('id', id)
          .select('id, plataforma, nombre, username_masked, region_url, activo, tipo, descripcion')
          .single()
        if (error) {
          console.error('Error al actualizar fv_credenciales:', error.code)
          return errorResponse('No se pudo actualizar la credencial: ' + (error.message || error.code), 400)
        }
        credData = data
      }

      // Actualizar secretos solo si se proporciono una nueva contrasena
      if (password_enc) {
        const { error: secretError } = await supabaseAdmin
          .from('fv_credenciales_secret')
          .upsert({
            credencial_id:    id,
            password_enc:     password_enc,
            cookies_updated_at: new Date().toISOString(),
          })
        if (secretError) {
          console.error('Error al actualizar fv_credenciales_secret:', secretError.code)
          return errorResponse('No se pudo actualizar el secreto de la credencial.', 500)
        }
      }

      return new Response(JSON.stringify({ ok: true, credencial: credData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (err) {
    // Loguear solo el tipo de error, nunca datos sensibles
    console.error('fv-create-credential error:', err instanceof Error ? err.message : 'unknown')
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
