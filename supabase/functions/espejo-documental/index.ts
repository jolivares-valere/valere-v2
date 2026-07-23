// ═══════════════════════════════════════════════════════════════════
// Edge Function: espejo-documental  (fase puente ★, 23-jul-2026)
// ═══════════════════════════════════════════════════════════════════
//
// Espeja el bucket 'documentos' de Supabase Storage a Google Drive
// (carpeta BACKUP CRM VALERE/ESPEJO DOCUMENTAL CRM), de forma
// self-healing por reconciliación (nunca por webhook de creación):
// en cada pasada compara el bucket contra la tabla de control
// espejo_drive_log y sube lo que falte. Nunca borra — si un documento
// desaparece de Storage, su copia en Drive permanece.
//
// Auth Drive: OAuth 2.0 con refresh_token de la cuenta personal de Juan
// (jolivares@valereconsultores.com) — pivote del 23-jul-2026 tras bloqueo
// de la política de organización GCP iam.disableServiceAccountKeyCreation
// que impedía descargar claves JSON de cuenta de servicio. Credenciales
// en Supabase Vault, servidas vía RPC espejo_drive_credenciales()
// (restringida a service_role). Ver docs/DISENO_ESPEJO_DOCUMENTAL_DRIVE.md.
//
// Patrón x-cron-secret vía Vault (check_espejo_cron_secret), igual que
// datadis-sync / push-lunes.
//
// Aplanado de nombre en Drive: '<tipo>/<entidad_id>/.../fichero.pdf' se
// sube como '<tipo>__<entidad_id>__..._fichero.pdf' dentro de la carpeta
// Drive de <tipo> (empresa/contrato/oportunidades) — sin esto, ficheros
// con nombres genéricos (uuid.pdf) de distintas empresas podrían chocar
// en Drive, y además permite rastrear el origen del fichero por nombre.
// Subcarpetas por entidad en Drive quedan fuera de alcance de esta v1
// (ver "Fuera de alcance" en el diseño).
//
// dry_run=true por defecto: calcula qué falta pero no sube nada.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET = 'documentos'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

interface Credenciales {
  espejo_drive_client_id: string
  espejo_drive_client_secret: string
  espejo_drive_refresh_token: string
  espejo_drive_folder_id_empresa: string
  espejo_drive_folder_id_contrato: string
  espejo_drive_folder_id_oportunidades: string
}

interface ObjetoBucket {
  name: string
  bytes: number | null
}

type TipoEntidad = 'empresa' | 'contrato' | 'oportunidades'

/** Primer segmento de la ruta ('empresa/<id>/...' -> 'empresa'). Determina
 *  la subcarpeta de Drive destino — replica la estructura del bucket. */
function carpetaTopNivel(path: string): TipoEntidad | null {
  const seg = path.split('/')[0]
  if (seg === 'empresa' || seg === 'contrato' || seg === 'oportunidades') return seg
  return null
}

async function obtenerAccessToken(cred: Credenciales): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cred.espejo_drive_client_id,
      client_secret: cred.espejo_drive_client_secret,
      refresh_token: cred.espejo_drive_refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`refresh token Google: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  if (!data.access_token) throw new Error('refresh token Google: respuesta sin access_token')
  return data.access_token as string
}

/** Sube un fichero a Drive vía multipart upload (metadata + contenido en
 *  un solo POST). Devuelve el file id creado. */
async function subirADrive(
  accessToken: string,
  nombre: string,
  folderId: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const boundary = 'espejo_drive_boundary_' + crypto.randomUUID()
  const metadata = JSON.stringify({ name: nombre, parents: [folderId] })

  const encoder = new TextEncoder()
  const parts: Uint8Array[] = [
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes,
    encoder.encode(`\r\n--${boundary}--`),
  ]
  const total = parts.reduce((n, p) => n + p.length, 0)
  const body = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    body.set(p, offset)
    offset += p.length
  }

  const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`subida Drive ${nombre}: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  if (!data.id) throw new Error(`subida Drive ${nombre}: respuesta sin id`)
  return data.id as string
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return j({ ok: false, error: 'Method not allowed' }, 405)

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Protección x-cron-secret vía RPC de Vault (mismo patrón que push-lunes/datadis-sync).
  {
    const provided = req.headers.get('x-cron-secret') ?? ''
    const { data: okSecret, error: sErr } = await sb.rpc('check_espejo_cron_secret', { p: provided })
    if (sErr || okSecret !== true) return j({ ok: false, error: 'unauthorized' }, 401)
  }

  let dryRun = true
  try {
    const b = await req.json()
    if (b && b.dry_run === false) dryRun = false
  } catch {
    /* default dry */
  }

  const out: Record<string, unknown> = { dry_run: dryRun }
  const subidos: string[] = []
  const fallidos: { path: string; error: string }[] = []

  try {
    // 1. Inventario real del bucket (RPC: storage.objects no está en PostgREST).
    const { data: objetosData, error: objErr } = await sb.rpc('espejo_drive_listar_objetos')
    if (objErr) throw new Error('listar bucket: ' + objErr.message)
    const objetos = (objetosData ?? []) as ObjetoBucket[]
    out.bucket_total = objetos.length

    // 2. Lo ya espejado (tabla de control).
    const { data: yaEspejado, error: logErr } = await sb.from('espejo_drive_log').select('storage_path')
    if (logErr) throw new Error('leer espejo_drive_log: ' + logErr.message)
    const yaEspejadoSet = new Set((yaEspejado ?? []).map((r: { storage_path: string }) => r.storage_path))

    // 3. Reconciliación: lo que falta.
    const faltantes = objetos.filter((o) => !yaEspejadoSet.has(o.name))
    out.faltantes = faltantes.length
    out.ya_espejados = yaEspejadoSet.size

    if (faltantes.length === 0 || dryRun) {
      out.ok = true
      out.nota = dryRun ? 'dry_run: no se ha subido nada' : 'nada pendiente'
      return j(out, 200)
    }

    // 4. Credenciales OAuth + folder IDs (una sola vez, no por fichero).
    const { data: credData, error: credErr } = await sb.rpc('espejo_drive_credenciales')
    if (credErr) throw new Error('leer credenciales: ' + credErr.message)
    const cred = credData as Credenciales
    if (!cred?.espejo_drive_refresh_token) throw new Error('credenciales incompletas en Vault')

    const folderPorTipo: Record<TipoEntidad, string> = {
      empresa: cred.espejo_drive_folder_id_empresa,
      contrato: cred.espejo_drive_folder_id_contrato,
      oportunidades: cred.espejo_drive_folder_id_oportunidades,
    }

    const accessToken = await obtenerAccessToken(cred)

    // 5. Subida de cada faltante (secuencial: bucket pequeño, prioriza fiabilidad sobre velocidad).
    for (const obj of faltantes) {
      const tipo = carpetaTopNivel(obj.name)
      if (!tipo) {
        fallidos.push({ path: obj.name, error: 'ruta fuera de empresa/contrato/oportunidades, se omite' })
        continue
      }
      try {
        const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(obj.name)
        if (dlErr || !blob) throw new Error('descarga Storage: ' + (dlErr?.message ?? 'sin datos'))
        const bytes = new Uint8Array(await blob.arrayBuffer())
        const hash = await sha256Hex(bytes)
        const nombreDrive = obj.name.replaceAll('/', '__') // aplanado, ver cabecera
        const driveFileId = await subirADrive(accessToken, nombreDrive, folderPorTipo[tipo], bytes, blob.type || 'application/pdf')

        const { error: insErr } = await sb.from('espejo_drive_log').insert({
          storage_path: obj.name,
          drive_file_id: driveFileId,
          sha256: hash,
          bytes: bytes.length,
        })
        if (insErr) throw new Error('registrar espejo_drive_log: ' + insErr.message)

        subidos.push(obj.name)
      } catch (e) {
        fallidos.push({ path: obj.name, error: (e as Error).message })
      }
    }

    out.subidos = subidos.length
    out.fallidos = fallidos.length
    if (fallidos.length > 0) out.detalle_fallidos = fallidos
    out.ok = fallidos.length === 0
  } catch (e) {
    out.ok = false
    out.error = (e as Error).message
  }

  // Parte del run (reutiliza audit_log, mismo patrón que push-lunes).
  try {
    await sb.from('audit_log').insert({
      actor_email: 'cron@espejo-documental',
      action: 'espejo_documental_run',
      entity_type: 'cron',
      entity_id: 'espejo-documental',
      metadata: out,
    })
  } catch {
    /* no bloquea */
  }

  return j(out, 200)
})
