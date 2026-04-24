import { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { logError } from '@/core/utils/logger'
import type { AsistenteMessage, AsistenteResponse } from '../types'

const INITIAL_MESSAGE: AsistenteMessage = {
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente del CRM. Pregúntame cómo hacer cualquier cosa — crear empresas, mover oportunidades, registrar actividades, etc. Respondo siempre basándome en la documentación.',
}

/**
 * Hook del asistente RAG del CRM.
 * Gestiona estado de mensajes, loading, llamada a la Edge Function,
 * y detecta automáticamente la sección de la ruta actual para filtrar
 * el RAG por sección cuando sea posible.
 */
export function useAsistente() {
  const location = useLocation()
  const [messages, setMessages] = useState<AsistenteMessage[]>([INITIAL_MESSAGE])
  const [loading, setLoading] = useState(false)

  // Detecta sección desde la ruta: "/empresas" → "empresas", "/oportunidades/123" → "oportunidades"
  const currentSection =
    location.pathname.split('/').filter(Boolean)[0] ?? null

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || loading) return

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
      setLoading(true)

      try {
        const { data, error } = await supabase.functions.invoke<AsistenteResponse>(
          'ask-crm-docs',
          {
            body: {
              question: trimmed,
              section: currentSection,
              match_count: 5,
            },
          },
        )

        if (error) throw error
        if (!data) throw new Error('Respuesta vacía del asistente')

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources ?? [],
          },
        ])
      } catch (err) {
        logError(err, 'useAsistente.send')
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Lo siento, ha habido un problema al procesar tu pregunta. Inténtalo de nuevo en un momento. Si persiste, contacta con el administrador del CRM.',
            error: true,
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loading, currentSection],
  )

  const reset = useCallback(() => {
    setMessages([INITIAL_MESSAGE])
  }, [])

  return {
    messages,
    loading,
    send,
    reset,
    currentSection,
  }
}
