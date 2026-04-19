import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { GoogleGenAI } from 'npm:@google/genai@1.0.0'

// Secret configurado via: supabase secrets set GEMINI_API_KEY=<valor>
// NUNCA pasar la API key desde el cliente — leerla solo desde Deno.env
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

if (!GEMINI_API_KEY) {
  console.error('[chat-consultor] GEMINI_API_KEY secret no configurado')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { messages, systemPrompt } = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      systemPrompt?: string
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // Adaptar mensajes al formato de Gemini (user/model en vez de user/assistant)
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents,
      ...(systemPrompt
        ? { config: { systemInstruction: systemPrompt } }
        : {}),
    })

    const text =
      response.text ??
      response.candidates?.[0]?.content?.parts?.[0]?.text ??
      ''

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[chat-consultor] error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
