// ═══════════════════════════════════════════════════════════════════
// AI Adapter — Interfaz sustituible para el asistente del CRM.
// ═══════════════════════════════════════════════════════════════════

import { GoogleGenAI } from 'npm:@google/genai@1.0.0'

export interface AIAdapter {
  embed(text: string): Promise<number[]>
  generate(prompt: string): Promise<string>
  readonly provider: string
}

// ── Gemini ────────────────────────────────────────────────────────

function createGeminiAdapter(apiKey: string): AIAdapter {
  const ai = new GoogleGenAI({ apiKey })

  return {
    provider: 'gemini',

    async embed(text: string): Promise<number[]> {
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: { outputDimensionality: 768 },
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
      // gemini-2.5-flash es un "thinking model" — su campo .text puede lanzar
      // una excepción cuando la respuesta incluye partes de razonamiento (thought).
      // Extraemos el texto manualmente de candidates[0].content.parts como fallback.
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })

      let text = ''

      // Intento 1: propiedad .text (funciona en modelos no-thinking)
      try {
        const t = (result as any).text
        if (typeof t === 'string' && t.length > 0) text = t
      } catch {
        // thinking model lanza aquí — usamos fallback
      }

      // Intento 2: extraer partes de texto de candidates (saltarse las thought parts)
      if (!text) {
        const parts: any[] =
          (result as any).candidates?.[0]?.content?.parts ?? []
        text = parts
          .filter((p: any) => p.text && !p.thought)
          .map((p: any) => String(p.text))
          .join('')
      }

      // Intento 3: método .response?.text() del SDK antiguo
      if (!text) {
        try {
          const t = (result as any).response?.text?.()
          if (typeof t === 'string' && t.length > 0) text = t
        } catch { /* ignorar */ }
      }

      if (!text) {
        throw new Error('Gemini generate devolvió respuesta vacía')
      }
      return text
    },
  }
}

// ── Factory ───────────────────────────────────────────────────────

export function getAdapter(): AIAdapter {
  const provider = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase()

  switch (provider) {
    case 'gemini': {
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) throw new Error('GEMINI_API_KEY env var missing')
      return createGeminiAdapter(apiKey)
    }
    default:
      throw new Error(`AI_PROVIDER "${provider}" no soportado`)
  }
}
