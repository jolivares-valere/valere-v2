// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-eliminar-autorizacion
// ═══════════════════════════════════════════════════════════════════
//
// Borra una autorización Datadis de forma completa (sin huérfanos):
//   1. PDF del Storage (bucket documentos)
//   2. fila de documentos
//   3. fila de datadis_autorizaciones
//
// Hard delete. El frontend muestra ConfirmDialog antes de invocar.
// Auth: verify_jwt=true + valida que el caller sea admin/master/manager.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET = 'documentos'

const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://valere-v2.pages.dev']
function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

interface ReqBody { autorizacion_id: string }

serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, cors)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, error: 'Falta Authorization Bearer' }, 401, cors)

  let body: ReqBody
  try { body = await req.json() } catch { return json({ ok: false, error: 'JSON invalido' }, 400, cors) }
  if (!body.autorizacion_id) return json({ ok: false, error: 'Falta autorizacion_id' }, 400, cors)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userErr || !userData?.user) return json({ ok: false, error: 'JWT invalido' }, 401, cors)
  const { data: perfil } = await admin.from('user_profiles').select('role').eq('id', userData.user.id).single()
  const role = (perfil?.role ?? '') as string
  if (!(role === 'admin' || role === 'master' || role === 'manager')) {
    return json({ ok: false, error: 'Solo un administrador puede eliminar autorizaciones.' }, 403, cors)
  }

  // Leer la autorización y su documento
  const { data: aut, error: autErr } = await admin
    .from('datadis_autorizaciones').select('id, documento_id').eq('id', body.autorizacion_id).single()
  if (autErr || !aut) return json({ ok: false, error: 'Autorización no encontrada' }, 404, cors)

  // 1+2: documento (Storage + fila)
  if (aut.documento_id) {
    const { data: doc } = await admin.from('documentos').select('ruta_storage').eq('id', aut.documento_id).single()
    if (doc?.ruta_storage) {
      await admin.storage.from(BUCKET).remove([doc.ruta_storage])  // borra PDF (ignora error si ya no existe)
    }
    await admin.from('documentos').delete().eq('id', aut.documento_id)
  }

  // 3: autorización
  const { error: delErr } = await admin.from('datadis_autorizaciones').delete().eq('id', body.autorizacion_id)
  if (delErr) return json({ ok: false, error: 'Error eliminando autorización: ' + delErr.message }, 500, cors)

  return json({ ok: true }, 200, cors)
})

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
