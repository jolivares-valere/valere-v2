// ═══════════════════════════════════════════════════════════════════
// AI Adapter — Interfaz sustituible para el asistente del CRM.
// ═══════════════════════════════════════════════════════════════════
//
// El adapter aísla el resto del sistema del proveedor concreto de IA.
// Cambiar de modelo (Gemini → Claude → OpenAI) = modificar este archivo,
// cero impacto en Edge Functions ni frontend.
//
// Ver docs/PLAN_ASISTENTE_RAG_CRM.md §Fase 3 para contexto.

import { GoogleGenAI } from 'npm:@google/genai@1.0.0'

export interface AIAdapter {
  /**
   * Genera un embedding vectorial para el texto dado.
   * Debe devolver un array de floats de 768 dimensiones (compatible con la tabla crm_help_embeddings).
   */
  embed(text: string): Promise<number[]>

  /**
   * Genera una respuesta textual a partir del prompt (que incluye system prompt + contexto + pregunta).
   */
  generate(prompt: string): Promise<string>

  /**
   * Nombre del proveedor (para logs/debug).
   */
  readonly provider: string
}

// ═══════════════════════════════════════════════════════════════════
// Gemini (Google) — implementación actual por defecto.
// ═══════════════════════════════════════════════════════════════════

function createGeminiAdapter(apiKey: string): AIAdapter {
  const ai = new GoogleGenAI({ apiKey })

  return {
    provider: 'gemini',

    async embed(text: string): Promise<number[]> {
      // gemini-embedding-001 con outputDimensionality=768 (coincide con la tabla
      // crm_help_embeddings y con scripts/generate-help-embeddings.mjs).
      // text-embedding-004 fue deprecado para cuentas nuevas en abril 2026.
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      })
      const values =
        (result as any).embeddings?.[0]?.values ??
        (result as any).embedding?.values ??
        null
      if (!Array.isArray(values) || values.length !== 768) {
        throw new Error(
          `Gemini embedding inválido: length=${values?.length}, expected 768`,
        )
      }
      return values
    },

    async generate(prompt: string): Promise<string> {
      // gemini-2.5-flash: sustituye a gemini-2.0-flash (deprecado para cuentas
      // nuevas desde abril 2026). Misma latencia, mejor calidad de respuesta.
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })
      // Formato de respuesta según @google/genai 1.0.0:
      const text =
        (result as any).text ??
        (result as any).response?.text() ??
        ''
      if (!text) {
        throw new Error('Gemini generate devolvió respuesta vacía')
      }
      return text
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// Factory — elige el adapter según AI_PROVIDER env var.
// Default: gemini.
// ═══════════════════════════════════════════════════════════════════

export function getAdapter(): AIAdapter {
  const provider = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase()

  switch (provider) {
    case 'gemini': {
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) throw new Error('GEMINI_API_KEY env var missing')
      return createGeminiAdapter(apiKey)
    }

    // Ejemplos futuros:
    // case 'claude':
    //   return createClaudeAdapter(Deno.env.get('ANTHROPIC_API_KEY')!)
    // case 'openai':
    //   return createOpenAIAdapter(Deno.env.get('OPENAI_API_KEY')!)

    default:
      throw new Error(`AI_PROVIDER "${provider}" no soportado`)
  }
}
