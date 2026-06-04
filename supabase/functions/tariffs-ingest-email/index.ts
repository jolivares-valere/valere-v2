/**
 * tariffs-ingest-email
 *
 * Recibe emails de comercializadoras con precios en el cuerpo (Visalia, etc.)
 * Flujo:
 *   Make → POST aqui → Guardar fuente → Gemini extrae → Normalizar → Fingerprint → Staging
 *
 * NUNCA escribe en comercializadora_ofertas.
 * TODO va a tariff_staging con estado 'pendiente_revision'.
 *
 * Soporta dry_run=true para backfill seguro.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const INGEST_TOKEN = Deno.env.get('MAKE_INGEST_TOKEN') ?? ''

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface IngestEmailPayload {
  gmail_message_id: string
  gmail_thread_id?: string
  from_email: string
  from_name?: string
  subject: string
  received_at: string
  body_html: string
  body_text: string
  dry_run?: boolean
  force?: boolean
}

interface GeminiExtraction {
  comercializadora: string
  productos: Array<{
    producto: string
    tarifa: string
    tipo_precio: 'fijo' | 'indexado' | 'mixto' | 'desconocido'
    vigencia_inicio: string | null
    vigencia_fin: string | null
    precios: {
      p1?: string; p2?: string; p3?: string
      p4?: string; p5?: string; p6?: string
    }
    potencia?: {
      pot1?: string; pot2?: string; pot3?: string
      pot4?: string; pot5?: string; pot6?: string
    }
    termino_fijo_eur_mes?: string
    ssaa_incluidos: boolean
    ssaa_eur_mwh?: string
    fee_valere_eur_mwh?: string
    unidad_original: string
    confianza: number
    campos_dudosos: string[]
  }>
}

// ─── Limpiador de HTML ────────────────────────────────────────────────────────
// Elimina etiquetas style/script/head y conserva tablas y texto relevante
// Gemini recibe HTML limpio, no el bruto del email con CSS de 50KB

function cleanHtml(html: string): string {
  if (!html) return ''

  let clean = html
    // Eliminar bloques <style>...</style> completos
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Eliminar bloques <script>...</script> completos
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Eliminar comentarios HTML
    .replace(/<!--[\s\S]*?-->/g, '')
    // Eliminar atributos style inline (reducen ruido sin perder estructura)
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    // Eliminar head completo
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    // Simplificar etiquetas de imagen (no necesitamos el src)
    .replace(/<img[^>]*>/gi, '[IMG]')
    // Colapsar espacios multiples
    .replace(/\s{3,}/g, '  ')
    .trim()

  // Limitar a 40.000 chars tras limpieza (suficiente para tablas de precios)
  if (clean.length > 40000) {
    clean = clean.substring(0, 40000) + '...[TRUNCADO]'
  }

  return clean
}

// ─── Normalizador decimal español ─────────────────────────────────────────────
// Determinista: nunca depende del LLM para la conversión numérica

function normalizeEnergyPrice(raw: string | undefined, unidad: string): number | null {
  if (!raw || raw.trim() === '' || raw === 'null') return null

  // Limpiar: quitar espacios, simbolos de moneda, texto
  let clean = raw.trim()
    .replace(/[€$£\s]/g, '')
    .replace(/EUR\/kWh|EUR\/MWh|€\/kWh|€\/MWh|c€\/kWh/gi, '')
    .trim()

  // Detectar separador decimal: si hay coma y punto, el ultimo es decimal
  // Casos: "0,175535" → 0.175535 | "1.234,56" → 1234.56 | "1,234.56" → 1234.56
  let value: number

  if (clean.includes(',') && clean.includes('.')) {
    // Formato europeo con miles: "1.234,56"
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato anglosajón con miles: "1,234.56"
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    // Solo coma → decimal español: "0,175535"
    clean = clean.replace(',', '.')
  }
  // Si solo punto → ya es decimal anglosajón o puede ser miles españoles
  // Heurística: si tiene exactamente 3 decimales y valor > 10, probablemente es miles
  // Ej: "175.535" como €/MWh → en realidad 175.535 €/MWh = 0.175535 €/kWh

  value = parseFloat(clean)
  if (isNaN(value)) return null

  // Conversión de unidades a EUR/kWh (unidad estándar del motor)
  const unidadNorm = unidad.toUpperCase().replace(/\s/g, '')

  if (unidadNorm.includes('MWH') || unidadNorm === 'EUR_MWH' || unidadNorm === 'EUR/MWH') {
    // EUR/MWh → EUR/kWh: dividir entre 1000
    value = value / 1000
  } else if (unidadNorm.startsWith('C') && unidadNorm.includes('KWH')) {
    // cEUR/kWh (céntimos) → EUR/kWh: dividir entre 100
    value = value / 100
  }
  // EUR/kWh → ya está en la unidad correcta

  // Validación de rango razonable para precios de energía en España
  // Entre 0.01 EUR/kWh y 0.80 EUR/kWh es el rango histórico normal
  if (value < 0.005 || value > 0.90) {
    // Fuera de rango — puede ser un error de conversión
    return null
  }

  // Redondear a 8 decimales
  return Math.round(value * 1e8) / 1e8
}

function normalizePowerPrice(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '') return null
  let clean = raw.trim().replace(/[€$£\s]/g, '').replace(/EUR\/kW.*|€\/kW.*/gi, '').trim()
  if (clean.includes(',') && !clean.includes('.')) clean = clean.replace(',', '.')
  const value = parseFloat(clean)
  if (isNaN(value)) return null
  // Precios de potencia en EUR/kW/año: rango razonable 0.5 - 60
  if (value < 0.1 || value > 100) return null
  return Math.round(value * 1e6) / 1e6
}

// ─── Fingerprint de tarifa ─────────────────────────────────────────────────────

async function calcFingerprint(fields: Record<string, string | number | boolean | null>): Promise<string> {
  const canonical = Object.keys(fields).sort().map(k => `${k}:${fields[k]}`).join('|')
  const encoder = new TextEncoder()
  const data = encoder.encode(canonical)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Prompt Gemini ────────────────────────────────────────────────────────────

function buildGeminiPrompt(subject: string, fromEmail: string, bodyText: string, bodyHtml: string): string {
  // Limpiar HTML antes de pasarlo a Gemini (elimina style/script/CSS)
  const cleanedHtml = cleanHtml(bodyHtml)
  // Extraer tablas HTML si las hay (para Visalia)
  const tableMatches = cleanedHtml.match(/<table[\s\S]*?<\/table>/gi) || []
  const tablesText = tableMatches.length > 0
    ? '\n\nTABLAS HTML DETECTADAS:\n' + tableMatches.slice(0, 5).join('\n').substring(0, 3000)
    : ''

  return `Eres un extractor de tarifas energéticas para Valere Consultores (España).

CONTEXTO DEL EMAIL:
- Asunto: ${subject}
- Remitente: ${fromEmail}
- Fecha recibido: hoy

CUERPO DEL EMAIL (texto plano):
${bodyText.substring(0, 4000)}
${tablesText}

INSTRUCCIONES:
1. Extrae TODOS los productos/tarifas que aparezcan en el email.
2. Para precios: devuelve el valor EXACTO como aparece en el email (con coma o punto, sin convertir).
3. Indica la unidad original detectada: "EUR_kWh", "EUR_MWh", "cEUR_kWh" o "desconocido".
4. Para vigencia: formato YYYY-MM-DD o null si no aparece.
5. ssaa_incluidos: true si el email dice que los SSAA están incluidos, false si dice "sin SSAA" o "precio base sin SSAA".
6. confianza: 0.0 a 1.0 según tu certeza en la extracción de ese producto.
7. campos_dudosos: lista de campos donde no estás seguro.
8. NO deduzcas ni inventes precios. Si no aparece un periodo, devuelve null para ese periodo.
9. NO decides si es NUEVA, ACTUALIZA o DUPLICADA. Solo extraes.

DEVUELVE EXCLUSIVAMENTE JSON válido con esta estructura exacta, sin texto adicional:
{
  "comercializadora": "nombre exacto de la comercializadora",
  "productos": [
    {
      "producto": "nombre del producto",
      "tarifa": "2.0TD|3.0TD|6.1TD|6.2TD|RL1|RL2|RL3|RL4|RL5|RL6|otro",
      "tipo_precio": "fijo|indexado|mixto|desconocido",
      "vigencia_inicio": "YYYY-MM-DD o null",
      "vigencia_fin": "YYYY-MM-DD o null",
      "precios": {
        "p1": "valor_exacto_o_null",
        "p2": "valor_exacto_o_null",
        "p3": "valor_exacto_o_null",
        "p4": "valor_exacto_o_null",
        "p5": "valor_exacto_o_null",
        "p6": "valor_exacto_o_null"
      },
      "potencia": {
        "pot1": "valor_exacto_o_null",
        "pot2": "valor_exacto_o_null",
        "pot3": "valor_exacto_o_null",
        "pot4": "valor_exacto_o_null",
        "pot5": "valor_exacto_o_null",
        "pot6": "valor_exacto_o_null"
      },
      "termino_fijo_eur_mes": "valor_exacto_o_null",
      "ssaa_incluidos": true,
      "ssaa_eur_mwh": "valor_o_null",
      "fee_valere_eur_mwh": null,
      "unidad_original": "EUR_kWh|EUR_MWh|cEUR_kWh|desconocido",
      "confianza": 0.9,
      "campos_dudosos": []
    }
  ]
}`
}

// ─── Llamada a Gemini ─────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<{ json: GeminiExtraction | null; raw: string; tokens_in: number; tokens_out: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err.substring(0, 200)}`)
  }

  const data = await res.json()
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const tokens_in: number = data.usageMetadata?.promptTokenCount ?? 0
  const tokens_out: number = data.usageMetadata?.candidatesTokenCount ?? 0

  // Extraer JSON del texto (Gemini a veces añade markdown)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { json: null, raw: rawText, tokens_in, tokens_out }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as GeminiExtraction
    return { json: parsed, raw: rawText, tokens_in, tokens_out }
  } catch {
    return { json: null, raw: rawText, tokens_in, tokens_out }
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  // Autenticación por token
  const token = req.headers.get('x-ingest-token') ?? ''
  if (token !== INGEST_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let payload: IngestEmailPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  // Validar campos obligatorios
  if (!payload.gmail_message_id || !payload.from_email || !payload.subject || !payload.received_at) {
    return new Response(JSON.stringify({ error: 'gmail_message_id, from_email, subject y received_at son obligatorios' }), { status: 400 })
  }

  if (!payload.body_html && !payload.body_text) {
    return new Response(JSON.stringify({ error: 'body_html o body_text son obligatorios' }), { status: 400 })
  }

  const isDryRun = payload.dry_run === true
  const isForce = payload.force === true

  // ── 1. Deduplicación por gmail_message_id ──────────────────────────────────
  const { data: existing } = await supabase
    .from('tariff_sources')
    .select('id, status')
    .eq('gmail_message_id', payload.gmail_message_id)
    .maybeSingle()

  if (existing && !isForce) {
    return new Response(JSON.stringify({
      result: 'already_processed',
      source_id: existing.id,
      status: existing.status,
      message: 'Email ya procesado. Usa force=true para reprocesar.'
    }), { status: 200 })
  }

  if (isDryRun) {
    return new Response(JSON.stringify({
      result: 'dry_run_ok',
      gmail_message_id: payload.gmail_message_id,
      subject: payload.subject,
      from_email: payload.from_email,
      message: 'dry_run=true: email detectado pero no procesado'
    }), { status: 200 })
  }

  // ── 2. Guardar fuente (evidencia inmutable) ────────────────────────────────
  const sourceData = {
    gmail_message_id: payload.gmail_message_id,
    gmail_thread_id: payload.gmail_thread_id ?? null,
    from_email: payload.from_email,
    from_name: payload.from_name ?? null,
    subject: payload.subject,
    received_at: payload.received_at,
    source_type: 'email_body',
    body_html: payload.body_html ?? null,
    body_text: payload.body_text ?? null,
    status: 'processing',
    raw_payload: {
      gmail_message_id: payload.gmail_message_id,
      from_email: payload.from_email,
      subject: payload.subject,
      received_at: payload.received_at,
      body_html_length: (payload.body_html ?? '').length,
      body_text_length: (payload.body_text ?? '').length,
      dry_run: payload.dry_run ?? false,
      force: payload.force ?? false
    }
  }

  let sourceId: string

  if (existing && isForce) {
    // Actualizar fuente existente
    const { error } = await supabase.from('tariff_sources').update({ status: 'processing' }).eq('id', existing.id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    sourceId = existing.id
  } else {
    const { data: source, error } = await supabase.from('tariff_sources').insert(sourceData).select('id').single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    sourceId = source.id
  }

  // ── 3. Llamar a Gemini ─────────────────────────────────────────────────────
  const prompt = buildGeminiPrompt(
    payload.subject,
    payload.from_email,
    payload.body_text ?? '',
    payload.body_html ?? ''
  )

  let geminiResult: { json: GeminiExtraction | null; raw: string; tokens_in: number; tokens_out: number }
  try {
    geminiResult = await callGemini(prompt)
  } catch (err) {
    await supabase.from('tariff_sources').update({ status: 'failed', error_message: String(err) }).eq('id', sourceId)
    return new Response(JSON.stringify({ error: 'Gemini call failed', detail: String(err) }), { status: 500 })
  }

  // ── 4. Guardar extracción bruta ────────────────────────────────────────────
  const extractionData = {
    tariff_source_id: sourceId,
    model: 'gemini',
    model_version: 'gemini-1.5-flash',
    raw_json: { text: geminiResult.raw },
    status: geminiResult.json ? 'pending' : 'invalid',
    tokens_input: geminiResult.tokens_in,
    tokens_output: geminiResult.tokens_out,
    prompt_used: prompt.substring(0, 2000)
  }

  const { data: extraction, error: extractionError } = await supabase
    .from('tariff_extractions')
    .insert(extractionData)
    .select('id')
    .single()

  if (extractionError) {
    await supabase.from('tariff_sources').update({ status: 'failed', error_message: extractionError.message }).eq('id', sourceId)
    return new Response(JSON.stringify({ error: extractionError.message }), { status: 500 })
  }

  if (!geminiResult.json) {
    await supabase.from('tariff_sources').update({ status: 'failed', error_message: 'Gemini no devolvio JSON valido' }).eq('id', sourceId)
    return new Response(JSON.stringify({
      result: 'extraction_failed',
      source_id: sourceId,
      extraction_id: extraction.id,
      raw_response: geminiResult.raw.substring(0, 500)
    }), { status: 200 })
  }

  const geminiData = geminiResult.json

  // ── 5. Normalizar precios y construir staging ──────────────────────────────
  const stagingRows: Record<string, unknown>[] = []
  const errors: string[] = []

  for (const producto of (geminiData.productos ?? [])) {
    const unidad = producto.unidad_original ?? 'EUR_kWh'

    // Normalizar precios de energía
    const p1 = normalizeEnergyPrice(producto.precios?.p1 ?? undefined, unidad)
    const p2 = normalizeEnergyPrice(producto.precios?.p2 ?? undefined, unidad)
    const p3 = normalizeEnergyPrice(producto.precios?.p3 ?? undefined, unidad)
    const p4 = normalizeEnergyPrice(producto.precios?.p4 ?? undefined, unidad)
    const p5 = normalizeEnergyPrice(producto.precios?.p5 ?? undefined, unidad)
    const p6 = normalizeEnergyPrice(producto.precios?.p6 ?? undefined, unidad)

    // Normalizar potencia
    const pot1 = normalizePowerPrice(producto.potencia?.pot1 ?? undefined)
    const pot2 = normalizePowerPrice(producto.potencia?.pot2 ?? undefined)
    const pot3 = normalizePowerPrice(producto.potencia?.pot3 ?? undefined)
    const pot4 = normalizePowerPrice(producto.potencia?.pot4 ?? undefined)
    const pot5 = normalizePowerPrice(producto.potencia?.pot5 ?? undefined)
    const pot6 = normalizePowerPrice(producto.potencia?.pot6 ?? undefined)

    // Validar que hay al menos un precio
    if (p1 === null && p2 === null && p3 === null) {
      errors.push(`Producto "${producto.producto}" (${producto.tarifa}): sin precios válidos tras normalización`)
      continue
    }

    // Calcular fingerprint
    const fingerprintFields = {
      comercializadora: (geminiData.comercializadora ?? '').toLowerCase().trim(),
      producto: (producto.producto ?? '').toLowerCase().trim(),
      tarifa: (producto.tarifa ?? '').toLowerCase().trim(),
      vigencia_inicio: producto.vigencia_inicio ?? 'null',
      vigencia_fin: producto.vigencia_fin ?? 'null',
      p1: p1 ?? 'null', p2: p2 ?? 'null', p3: p3 ?? 'null',
      p4: p4 ?? 'null', p5: p5 ?? 'null', p6: p6 ?? 'null',
      ssaa_incluidos: producto.ssaa_incluidos ?? true,
    }
    const fingerprint = await calcFingerprint(fingerprintFields)

    // Detectar si es NUEVA o DUPLICADA comparando con staging y con comercializadora_ofertas
    const { data: existingStaging } = await supabase
      .from('tariff_staging')
      .select('id, estado')
      .eq('fingerprint_tarifa', fingerprint)
      .maybeSingle()

    let decision = 'NUEVA'
    if (existingStaging) {
      decision = 'DUPLICADA'
    } else {
      // Comprobar si hay una tarifa activa con misma comercializadora+producto+tarifa
      const { data: existingOferta } = await supabase
        .from('comercializadora_ofertas')
        .select('id')
        .eq('product_name', producto.producto)
        .eq('access_rate', producto.tarifa)
        .limit(1)
        .maybeSingle()
      if (existingOferta) decision = 'ACTUALIZA'
    }

    const normalizedJson = {
      comercializadora: geminiData.comercializadora,
      producto: producto.producto,
      tarifa: producto.tarifa,
      p1, p2, p3, p4, p5, p6,
      pot1, pot2, pot3, pot4, pot5, pot6,
      unidad_normalizada: 'EUR_kWh'
    }

    // Si es DUPLICADA, no insertar en staging
    if (decision === 'DUPLICADA') {
      errors.push(`Producto "${producto.producto}" (${producto.tarifa}): DUPLICADA (fingerprint ya existe en staging)`)
      continue
    }

    stagingRows.push({
      tariff_source_id: sourceId,
      tariff_extraction_id: extraction.id,
      comercializadora: geminiData.comercializadora ?? payload.from_email,
      producto: producto.producto,
      tarifa: producto.tarifa,
      tipo_precio: producto.tipo_precio ?? 'fijo',
      vigencia_inicio: producto.vigencia_inicio ?? null,
      vigencia_fin: producto.vigencia_fin ?? null,
      p1, p2, p3, p4, p5, p6,
      pot1, pot2, pot3, pot4, pot5, pot6,
      ssaa_incluidos: producto.ssaa_incluidos ?? true,
      ssaa_eur_mwh: producto.ssaa_eur_mwh ? parseFloat(producto.ssaa_eur_mwh.replace(',', '.')) : null,
      fee_valere_eur_mwh: producto.fee_valere_eur_mwh ? parseFloat(producto.fee_valere_eur_mwh.replace(',', '.')) : 0,
      termino_fijo_eur_mes: producto.termino_fijo_eur_mes ? parseFloat(producto.termino_fijo_eur_mes.replace(',', '.')) : null,
      unidad_original: unidad,
      fingerprint_tarifa: fingerprint,
      estado: 'pendiente_revision',
      decision_backend: decision,
      notas: producto.campos_dudosos?.length ? `Campos dudosos: ${producto.campos_dudosos.join(', ')}` : null
    })

    // Actualizar normalized_json en la extracción
    await supabase.from('tariff_extractions')
      .update({ normalized_json: normalizedJson, status: 'valid', confidence: producto.confianza ?? null,
               campos_dudosos: producto.campos_dudosos ?? [], validation_errors: errors })
      .eq('id', extraction.id)
  }

  // ── 6. Insertar en staging ─────────────────────────────────────────────────
  let insertedCount = 0
  if (stagingRows.length > 0) {
    const { data: inserted, error: stagingError } = await supabase
      .from('tariff_staging')
      .insert(stagingRows)
      .select('id')

    if (stagingError) {
      await supabase.from('tariff_sources').update({ status: 'failed', error_message: stagingError.message }).eq('id', sourceId)
      return new Response(JSON.stringify({ error: stagingError.message }), { status: 500 })
    }
    insertedCount = inserted?.length ?? 0
  }

  // ── 7. Actualizar estado de la fuente ──────────────────────────────────────
  await supabase.from('tariff_sources').update({
    status: 'processed',
    processed_at: new Date().toISOString()
  }).eq('id', sourceId)

  return new Response(JSON.stringify({
    result: 'ok',
    source_id: sourceId,
    extraction_id: extraction.id,
    comercializadora: geminiData.comercializadora,
    productos_extraidos: geminiData.productos?.length ?? 0,
    productos_en_staging: insertedCount,
    advertencias: errors,
    message: `${insertedCount} tarifa(s) en staging con estado pendiente_revision`
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
