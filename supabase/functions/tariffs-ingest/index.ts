// ═══════════════════════════════════════════════════════════════════
// Edge Function: tariffs-ingest
// ═══════════════════════════════════════════════════════════════════
//
// Endpoint llamado por Make (Integromat) tras detectar un email con
// tarifa adjunta en el buzón de Valere. Recibe los metadatos del
// email y el documento, y los registra en `tariff_documents` para
// que el pipeline de extracción los procese.
//
// Auth: token compartido MAKE_INGEST_TOKEN (no JWT de usuario).
//   Make incluye el token en el header: x-ingest-token: {token}
//   Esto evita tener que gestionar refresh tokens en Make.
//
// Flujo esperado desde Make:
//   1. Trigger: nuevo email con adjunto en buzón tarifas@valere
//   2. Make sube el adjunto a Google Drive (carpeta TARIFAS_VIGENTES)
//   3. Make llama a este endpoint con:
//      - drive_file_id: ID del archivo en Drive
//      - filename: nombre original del adjunto
//      - comercializadora: nombre extraído del email (puede ser vacío)
//      - email_subject: asunto del email
//      - email_from: remitente
//      - email_date: fecha del email (ISO8601)
//      - sha256: hash SHA256 del archivo (dedup)
//
// Variables de entorno necesarias:
//   MAKE_INGEST_TOKEN          — secret compartido con Make
//   SUPABASE_URL               — auto
//   SUPABASE_SERVICE_ROLE_KEY  — auto
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

// ── Configuración ──────────────────────────────────────────────────

const MAKE_INGEST_TOKEN = Deno.env.get('MAKE_INGEST_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ── Tipos ──────────────────────────────────────────────────────────

interface IngestPayload {
  drive_file_id:    string     // ID del archivo en Google Drive
  filename:         string     // Nombre original del adjunto
  comercializadora?: string    // Nombre de la comercializadora (puede venir vacío)
  email_subject?:   string     // Asunto del email de origen
  email_from?:      string     // Remitente del email
  email_date?:      string     // Fecha del email (ISO8601)
  sha256?:          string     // Hash SHA256 del archivo (para dedup)
  notas?:           string     // Campo libre para Make
}

// ── Handler ────────────────────────────────────────────────────────

serve(async (req) => {
  // Validar método
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, x-ingest-token',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validar token de autenticación Make
  if (!MAKE_INGEST_TOKEN) {
    console.error('[tariffs-ingest] MAKE_INGEST_TOKEN no configurado')
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ingestToken = req.headers.get('x-ingest-token')
  if (!ingestToken || ingestToken !== MAKE_INGEST_TOKEN) {
    return new Response(JSON.stringify({ error: 'Invalid ingest token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parsear payload
  let payload: IngestPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validar campos obligatorios
  if (!payload.drive_file_id || !payload.filename) {
    return new Response(
      JSON.stringify({ error: 'drive_file_id y filename son obligatorios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Dedup: si ya existe un documento con el mismo sha256, devolver el existente
  if (payload.sha256) {
    const { data: existing } = await supabase
      .from('tariff_documents')
      .select('id, filename, created_at')
      .eq('sha256', payload.sha256)
      .maybeSingle()

    if (existing) {
      console.log(`[tariffs-ingest] Documento duplicado detectado: ${existing.id} (sha256: ${payload.sha256})`)
      return new Response(
        JSON.stringify({
          ok: true,
          duplicado: true,
          document_id: existing.id,
          mensaje: `Documento ya registrado (${existing.filename}, ${existing.created_at})`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Insertar en tariff_documents
  // Nota: la tabla tariff_documents fue creada en FASE 1 (migration 03/09)
  const { data: doc, error } = await supabase
    .from('tariff_documents')
    .insert({
      drive_file_id:    payload.drive_file_id,
      filename:         payload.filename,
      comercializadora: payload.comercializadora ?? null,
      email_subject:    payload.email_subject ?? null,
      email_from:       payload.email_from ?? null,
      email_date:       payload.email_date ?? null,
      sha256:           payload.sha256 ?? null,
      notas:            payload.notas ?? null,
      status:           'pendiente',   // Estado inicial: pendiente de extracción
    })
    .select('id')
    .single()

  if (error) {
    console.error('[tariffs-ingest] Error al insertar:', error.message)
    return new Response(
      JSON.stringify({ error: 'Error al registrar documento', detail: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[tariffs-ingest] Documento registrado: ${doc.id} — ${payload.filename}`)

  return new Response(
    JSON.stringify({
      ok: true,
      duplicado: false,
      document_id: doc.id,
      mensaje: `Documento registrado correctamente`,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})
