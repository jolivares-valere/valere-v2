// ═══════════════════════════════════════════════════════════════════
// Edge Function: ask-crm-docs
// ═══════════════════════════════════════════════════════════════════
//
// Endpoint del asistente del CRM. Recibe una pregunta del usuario,
// hace búsqueda semántica (RAG) sobre docs/help/ indexados en
// crm_help_embeddings, y devuelve una respuesta con citas a las
// fuentes.
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

    if (!chunks || chunks.length === 0) {
      return jsonResponse(
        {
          answer:
            'No encuentro información sobre eso en la documentación. Pregunta al administrador del CRM.',
          sources: [],
        },
        200,
        corsHeaders,
      )
    }

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
