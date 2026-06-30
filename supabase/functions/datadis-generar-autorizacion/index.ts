// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-generar-autorizacion
// ═══════════════════════════════════════════════════════════════════
//
// Genera el PDF de autorización Datadis (plantilla Valere) autorrellenado
// con datos del CRM, lo guarda en Storage (bucket documentos), registra el
// documento y crea la autorización en datadis_autorizaciones (estado=generada).
//
// VALIDACIÓN DE DATOS CRÍTICOS (decisión 2026-06-27, híbrido bloqueante):
// si faltan razón social, CIF, firmante (nombre+DNI) o al menos 1 CUPS,
// NO genera y devuelve { ok:false, faltan:[...] } con campo + dónde completarlo,
// para que el frontend muestre el panel "Faltan datos" con enlaces.
//
// Premarca por defecto: "Autorizo TODOS los CUPS" + "Sí".
//
// Auth: verify_jwt=true. El caller debe ser admin (RLS de insert lo exige igual).
//
// Secrets (Supabase auto): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'
import { generarAutorizacionPDF } from './pdf.ts'

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

interface FaltaDato {
  campo: string          // identificador técnico
  etiqueta: string       // texto legible
  donde: string          // dónde completarlo (ruta/entidad)
}

interface ReqBody {
  empresa_id: string
  contacto_firmante_id?: string | null
  alcance_cups?: 'todos' | 'lista'
  cups_ids?: string[]            // si alcance = 'lista'
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405, cors)
  }
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ ok: false, error: 'Falta Authorization Bearer' }, 401, cors)
  }

  let body: ReqBody
  try { body = await req.json() } catch { return json({ ok: false, error: 'JSON inválido' }, 400, cors) }
  if (!body.empresa_id) return json({ ok: false, error: 'Falta empresa_id' }, 400, cors)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Validar caller (JWT) y que sea admin
  const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userErr || !userData?.user) return json({ ok: false, error: 'JWT inválido' }, 401, cors)
  const { data: perfil } = await admin.from('user_profiles').select('rol, role').eq('id', userData.user.id).single()
  const rol = (perfil?.rol ?? perfil?.role ?? '') as string
  if (rol !== 'admin' && rol !== 'master') {
    return json({ ok: false, error: 'Solo un administrador puede generar autorizaciones.' }, 403, cors)
  }

  // ── Leer datos del CRM ──────────────────────────────────────────
  const { data: empresa, error: empErr } = await admin
    .from('empresas').select('id, nombre, nif').eq('id', body.empresa_id).single()
  if (empErr || !empresa) return json({ ok: false, error: 'Empresa no encontrada' }, 404, cors)

  let firmante: { nombre: string; apellidos: string | null; dni: string | null; cargo: string | null } | null = null
  if (body.contacto_firmante_id) {
    const { data: c } = await admin.from('contactos')
      .select('nombre, apellidos, dni, cargo').eq('id', body.contacto_firmante_id).single()
    firmante = c ?? null
  } else {
    // fallback: contacto firmante de la empresa
    const { data: c } = await admin.from('contactos')
      .select('nombre, apellidos, dni, cargo').eq('empresa_id', body.empresa_id)
      .eq('es_firmante', true).is('deleted_at', null).limit(1).maybeSingle()
    firmante = c ?? null
  }

  const { data: cupsRows } = await admin.from('cups')
    .select('codigo_cups').eq('empresa_id', body.empresa_id).is('deleted_at', null)
  const cupsList = (cupsRows ?? []).map((r: { codigo_cups: string }) => r.codigo_cups).filter(Boolean)

  // ── VALIDACIÓN de datos críticos (bloqueante) ──────────────────
  const faltan: FaltaDato[] = []
  if (!empresa.nombre?.trim()) faltan.push({ campo: 'razon_social', etiqueta: 'Razón social de la empresa', donde: `empresa/${empresa.id}` })
  if (!empresa.nif?.trim()) faltan.push({ campo: 'cif', etiqueta: 'CIF/NIF de la empresa', donde: `empresa/${empresa.id}` })
  if (!firmante) {
    faltan.push({ campo: 'firmante', etiqueta: 'Contacto firmante (marcar "es firmante" en un contacto)', donde: `empresa/${empresa.id}/contactos` })
  } else {
    if (!firmante.nombre?.trim()) faltan.push({ campo: 'firmante_nombre', etiqueta: 'Nombre del firmante', donde: `empresa/${empresa.id}/contactos` })
    if (!firmante.dni?.trim()) faltan.push({ campo: 'firmante_dni', etiqueta: 'DNI/NIE del firmante', donde: `empresa/${empresa.id}/contactos` })
  }
  if (cupsList.length === 0) faltan.push({ campo: 'cups', etiqueta: 'Al menos un CUPS de la empresa', donde: `empresa/${empresa.id}/cups` })

  if (faltan.length > 0) {
    return json({ ok: false, faltan, mensaje: 'Faltan datos para generar la autorización. Complétalos en el CRM y vuelve a intentarlo.' }, 422, cors)
  }

  // ── Generar PDF ────────────────────────────────────────────────
  const alcance = body.alcance_cups ?? 'todos'
  const calidad = mapCargoACalidad(firmante!.cargo)
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generarAutorizacionPDF({
      empresaNombre: empresa.nombre,
      empresaCif: empresa.nif,
      firmanteNombre: [firmante!.nombre, firmante!.apellidos].filter(Boolean).join(' '),
      firmanteDni: firmante!.dni!,
      calidadFirmante: calidad,
      alcanceCups: alcance,
      autoriza: true,                              // premarca Sí
      cupsList: alcance === 'lista' ? cupsList : [],
      incluirAnexo: alcance === 'lista' || cupsList.length > 1,
    })
  } catch (e) {
    return json({ ok: false, error: 'Error generando el PDF: ' + (e as Error).message }, 500, cors)
  }

  // ── Subir a Storage ────────────────────────────────────────────
  const docId = crypto.randomUUID()
  const fileName = `autorizacion_datadis_${slug(empresa.nombre)}_${Date.now()}.pdf`
  const rutaStorage = `empresa/${empresa.id}/${docId}.pdf`
  const { error: upErr } = await admin.storage.from(BUCKET)
    .upload(rutaStorage, pdfBytes, { contentType: 'application/pdf', upsert: false })
  if (upErr) return json({ ok: false, error: 'Error subiendo a Storage: ' + upErr.message }, 500, cors)

  // ── Registrar en documentos ────────────────────────────────────
  const { data: doc, error: docErr } = await admin.from('documentos').insert({
    id: docId,
    entidad_tipo: 'empresa',
    entidad_id: empresa.id,
    nombre: fileName,
    tipo: 'pdf',
    ruta_storage: rutaStorage,
    tamanio: pdfBytes.byteLength,
    mime_type: 'application/pdf',
    descripcion: 'Autorización Datadis generada por el CRM',
    subido_por: userData.user.id,
  }).select('id').single()
  if (docErr) return json({ ok: false, error: 'Error registrando documento: ' + docErr.message }, 500, cors)

  // ── Crear autorización (estado generada) ──────────────────────
  const { data: aut, error: autErr } = await admin.from('datadis_autorizaciones').insert({
    empresa_id: empresa.id,
    contacto_firmante_id: body.contacto_firmante_id ?? null,
    calidad_firmante: calidad,
    alcance_cups: alcance,
    cups_ids: body.cups_ids ?? [],
    estado: 'generada',
    documento_id: doc.id,
    finalidad: 'Prestación de servicios de consultoría y asesoramiento energético',
    metodo_verificacion: 'cif_cups',
    fecha_generacion: new Date().toISOString(),
    creado_por: userData.user.id,
  }).select('id').single()
  if (autErr) return json({ ok: false, error: 'Error creando autorización: ' + autErr.message }, 500, cors)

  // URL firmada para descarga inmediata
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(rutaStorage, 300)

  return json({
    ok: true,
    autorizacion_id: aut.id,
    documento_id: doc.id,
    url: signed?.signedUrl ?? null,
    nombre: fileName,
  }, 200, cors)
})

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function mapCargoACalidad(cargo: string | null): 'titular' | 'representante_legal' | 'apoderado' | null {
  if (!cargo) return null
  const c = cargo.toLowerCase()
  if (c.includes('apoderad')) return 'apoderado'
  if (c.includes('represent') || c.includes('administrador') || c.includes('legal')) return 'representante_legal'
  if (c.includes('titular') || c.includes('autónomo') || c.includes('autonomo')) return 'titular'
  return null
}

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase().slice(0, 40)
}
