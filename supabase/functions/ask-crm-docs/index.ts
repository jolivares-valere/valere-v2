// ═══════════════════════════════════════════════════════════════════
// Edge Function: ask-crm-docs (v10 — umbral de similitud)
// ═══════════════════════════════════════════════════════════════════
//
// Endpoint del asistente del CRM. Recibe una pregunta del usuario,
// hace búsqueda semántica (RAG) sobre docs/help/ indexados en
// crm_help_embeddings, y devuelve una respuesta con citas a las
// fuentes.
//
// v10 (2026-04-26): umbral de similitud configurable.
// - Si top_similarity < STRICT_MIN_SIMILARITY (0.50 default) → fallback fijo
//   sin llamar al LLM (mata bug "responde a cualquier off-topic").
// - Si STRICT ≤ top_similarity < MIN_SIMILARITY (0.62 default) → contesta
//   pero loggea encontrada_respuesta=false para análisis de gaps.
// - Ver docs/PATCH_ASISTENTE_RAG_2026-04-25.md.
//
// Requiere JWT válido (autenticación Supabase) — solo usuarios
// logueados del CRM pueden usarlo.
//
// Ver docs/PLAN_ASISTENTE_RAG_CRM.md §Fase 3.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'
import { getAdapter } from '../_shared/ai-adapter.ts'

// ───────────── Config ─────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = [
  Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000',
  'https://valere-v2.pages.dev',
]

const MAX_QUESTION_LENGTH = 500
const DEFAULT_MATCH_COUNT = 5

// Umbrales de similitud (configurables por env var):
// - STRICT_MIN_SIMILARITY: por debajo de esto NO se llama al LLM (fallback fijo).
// - MIN_SIMILARITY: por encima del strict pero por debajo de esto, se contesta
//   pero se loggea como `encontrada_respuesta=false` para análisis de gaps.
const MIN_SIMILARITY = Number(Deno.env.get('MIN_SIMILARITY') ?? '0.62')
const STRICT_MIN_SIMILARITY = Number(Deno.env.get('STRICT_MIN_SIMILARITY') ?? '0.50')

// ───────────── CORS ─────────────

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// ───────────── System prompt ─────────────

const SYSTEM_PROMPT = `Eres el asistente del CRM Valere. Ayudas a los compañeros de Valere Consultores (consultora energética) a usar el CRM. Respondes SIEMPRE basándote en la documentación adjunta.

REGLAS ESTRICTAS:
- Idioma: castellano siempre.
- Si la pregunta es simple, responde en 1-3 frases.
- Si das pasos, numéralos.
- Cita las secciones de doc en las que te basas AL FINAL de la respuesta, en formato: "Fuentes: [título]".
- Si la información NO está en la doc adjunta, di literalmente: "No encuentro información sobre eso en la documentación. Pregunta al administrador del CRM." y nada más.
- NO inventes funcionalidades, rutas, botones ni características que no aparezcan en la doc.
- NO hables de temas ajenos al CRM (política, geografía, opiniones, etc.) — si te preguntan otra cosa, redirige a consultas sobre el CRM.
- Los compañeros son consultores energéticos, NO desarrolladores. Evita jerga técnica (React, Supabase, SQL, etc.) salvo que sea imprescindible.`

// ───────────── Handler ─────────────

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed' },
      405,
      corsHeaders,
    )
  }

  // Auth — JWT obligatorio
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
  }

  // Cliente Supabase con el JWT del usuario (hereda permisos RLS)
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser()
  if (userErr || !userData?.user) {
    return jsonResponse({ error: 'Invalid token' }, 401, corsHeaders)
  }

  // Parse body
  let body: { question?: string; section?: string; match_count?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders)
  }

  const question = (body.question ?? '').trim()
  const section = body.section?.trim() || null
  const matchCount = Math.min(
    Math.max(body.match_count ?? DEFAULT_MATCH_COUNT, 1),
    10,
  )

  if (!question) {
    return jsonResponse(
      { error: 'Pregunta vacía' },
      400,
      corsHeaders,
    )
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse(
      { error: `Pregunta demasiado larga (máx ${MAX_QUESTION_LENGTH} caracteres)` },
      400,
      corsHeaders,
    )
  }

  const startedAt = Date.now()
  try {
    const ai = getAdapter()

    // 1. Embedding de la pregunta
    const queryEmbedding = await ai.embed(question)

    // 2. Búsqueda semántica en pgvector via RPC
    //    Usamos service role para bypasar RLS de lectura (cualquier authed puede leer igual).
    const supabaseService = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    )
    const { data: chunks, error: matchErr } = await supabaseService.rpc(
      'match_crm_help',
      {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        filter_section: section,
      },
    )

    if (matchErr) {
      console.error('[ask-crm-docs] match_crm_help error:', matchErr)
      return jsonResponse(
        {
          answer:
            'Lo siento, no he podido buscar la respuesta. Vuelve a intentarlo en un momento.',
          sources: [],
        },
        200,
        corsHeaders,
      )
    }

    const topSim = chunks?.[0]?.similarity ?? 0

    // Caso (a): sin chunks O similitud catastrófica → NO llamamos al LLM.
    // Devolvemos fallback fijo + log con encontrada_respuesta=false.
    // Esto mata el bug "responde a cualquier pregunta off-topic" detectado en
    // docs/PATCH_ASISTENTE_RAG_2026-04-25.md (e.g. "recomiéndame un restaurante" → sim 0.559).
    if (!chunks || chunks.length === 0 || topSim < STRICT_MIN_SIMILARITY) {
      await logAsistente(supabaseService, {
        pregunta: question,
        seccion: section,
        encontrada_respuesta: false,
        num_chunks: chunks?.length ?? 0,
        top_similarity: topSim || null,
        provider: ai.provider,
        duracion_ms: Date.now() - startedAt,
      })

      return jsonResponse(
        {
          answer:
            'No encuentro información sobre eso en la documentación. Pregunta al administrador del CRM.',
          sources: [],
          no_match: true,
        },
        200,
        corsHeaders,
      )
    }

    // Caso (b): similitud baja (entre strict y min) → seguimos al LLM, pero
    // marcamos `encontrada_respuesta=false` para hacer visibles las queries
    // borrosas en el análisis de gaps de doc.
    const encontradaRespuesta = topSim >= MIN_SIMILARITY

    // 3. Construir prompt con contexto
    const context = chunks
      .map(
        (c: any, i: number) =>
          `[Fuente ${i + 1}: ${c.title} (${c.source_path})]\n${c.chunk_text}`,
      )
      .join('\n\n---\n\n')

    const fullPrompt = `${SYSTEM_PROMPT}

## Documentación relevante

${context}

## Pregunta del usuario

${question}

## Tu respuesta (en castellano, concisa, con Fuentes al final):`

    // 4. Generar respuesta
    const answer = await ai.generate(fullPrompt)

    // 4.5. Log de la consulta exitosa.
    // `encontrada_respuesta` se decide por umbral, NO por "el LLM contestó algo".
    await logAsistente(supabaseService, {
      pregunta: question,
      seccion: section,
      encontrada_respuesta: encontradaRespuesta,
      num_chunks: chunks.length,
      top_similarity: topSim,
      provider: ai.provider,
      duracion_ms: Date.now() - startedAt,
    })

    // 5. Devolver con citas
    return jsonResponse(
      {
        answer,
        sources: chunks.map((c: any) => ({
          title: c.title,
          path: c.source_path,
          url: c.source_url,
          similarity: Number(c.similarity?.toFixed?.(3) ?? 0),
          section: c.section,
        })),
        provider: ai.provider,
      },
      200,
      corsHeaders,
    )
  } catch (err) {
    console.error('[ask-crm-docs] error:', err)
    return jsonResponse(
      {
        answer:
          'Lo siento, ha ocurrido un error al procesar la pregunta. Vuelve a intentarlo.',
        sources: [],
        error: err instanceof Error ? err.message : String(err),
      },
      500,
      corsHeaders,
    )
  }
})

// ───────────── Utils ─────────────

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Log anonimizado de consulta. NO guarda user_id ni IP — solo métricas
 * para análisis de uso (qué preguntan, qué falta en la doc).
 * Falla silenciosamente si hay error: NO bloquear la respuesta al usuario.
 */
async function logAsistente(
  supabase: ReturnType<typeof createClient>,
  data: {
    pregunta: string
    seccion: string | null
    encontrada_respuesta: boolean
    num_chunks: number
    top_similarity: number | null
    provider: string
    duracion_ms: number
  },
): Promise<void> {
  try {
    await supabase.from('crm_asistente_log').insert({
      pregunta: data.pregunta,
      seccion: data.seccion,
      encontrada_respuesta: data.encontrada_respuesta,
      num_chunks_encontrados: data.num_chunks,
      top_similarity: data.top_similarity,
      provider: data.provider,
      duracion_ms: data.duracion_ms,
    })
  } catch (err) {
    console.warn('[ask-crm-docs] log failed (no bloqueante):', err)
  }
}
