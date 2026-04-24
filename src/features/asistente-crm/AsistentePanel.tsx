import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { MessageCircle, X, Send, Loader2, RefreshCw } from 'lucide-react'
import { useAsistente } from './hooks/useAsistente'
import { MessageBubble } from './components/MessageBubble'

/**
 * Widget flotante del asistente del CRM.
 *
 * Aparece en todas las páginas del CRM como una burbuja abajo a la derecha.
 * Al hacer click, se abre un panel de chat con el asistente RAG.
 *
 * El hook useAsistente detecta automáticamente la sección actual de la ruta
 * y la pasa a la Edge Function ask-crm-docs para filtrar el RAG por contexto.
 *
 * Ver docs/PLAN_ASISTENTE_RAG_CRM.md §Fase 4.
 */
export default function AsistentePanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, loading, send, reset, currentSection } = useAsistente()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll al último mensaje cuando llegan respuestas
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])

  // Focus input al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    await send(question)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía, Shift+Enter nueva línea
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar asistente del CRM' : 'Abrir asistente del CRM'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full w-14 h-14 shadow-xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 w-[min(420px,calc(100vw-3rem))] h-[min(600px,calc(100vh-8rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Asistente del CRM"
        >
          {/* Header */}
          <header className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Asistente del CRM</h2>
              <p className="text-xs opacity-90">
                {currentSection
                  ? `Contexto: ${currentSection}`
                  : 'Pregúntame cualquier duda'}
              </p>
            </div>
            <button
              onClick={reset}
              aria-label="Reiniciar conversación"
              className="p-1.5 rounded hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              title="Reiniciar conversación"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </header>

          {/* Mensajes */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50"
          >
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                </div>
                <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-3 py-2 text-sm italic">
                  Buscando en la documentación...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <footer className="px-3 py-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta..."
                rows={1}
                maxLength={500}
                disabled={loading}
                aria-label="Pregunta para el asistente"
                className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 max-h-24"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                aria-label="Enviar pregunta"
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl w-10 h-10 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-center">
              Enter para enviar · Shift+Enter nueva línea · máx. 500 caracteres
            </p>
          </footer>
        </div>
      )}
    </>
  )
}
