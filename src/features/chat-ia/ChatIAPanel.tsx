import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Loader2, Sparkles, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/core/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Eres un consultor experto de Valere Consultores. Tu objetivo es ayudar a los usuarios a:
- Rellenar los datos de la aplicación correctamente
- Explicar qué significan los resultados, gráficos y métricas
- Orientar sobre conceptos de energía: tarifas, periodos, excedentes, autoconsumo
- Dar recomendaciones prácticas para ahorrar en la factura energética

Responde siempre en español, de forma concisa, profesional y cercana.
Usa **negritas** para términos clave. Completa siempre tus explicaciones.
Si preguntan algo fuera de contexto, redirígelo amablemente a temas energéticos.`;

export default function ConsultantChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu consultor IA de Valere. ¿En qué puedo ayudarte con la aplicación o tus análisis energéticos?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-consultor', {
        body: {
          messages: [...messages, { role: 'user', content: userMessage }],
          systemPrompt: SYSTEM_PROMPT,
        },
      });

      if (error) throw error;

      const aiResponse = (data?.text as string) || 'Lo siento, no he podido procesar tu solicitud.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error invoking chat-consultor:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'El Consultor IA no está disponible. Verifica que la Edge Function `chat-consultor` esté desplegada y que el secret `GEMINI_API_KEY` esté configurado.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-md bg-white overflow-hidden flex flex-col h-[420px]">
      <div className="bg-gradient-to-r from-valere-green-dark/10 to-valere-green-medium/10 p-4 border-b border-valere-green-medium/15 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-valere-green-dark" />
        <h4 className="text-xs font-bold text-valere-green-dark uppercase tracking-widest">Consultor IA Valere</h4>
      </div>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                m.role === 'user' ? 'bg-valere-blue-dark text-white' : 'bg-valere-green-medium/20 text-valere-green-dark'
              }`}>
                {m.role === 'user' ? <User className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-valere-blue-dark text-white rounded-tr-none'
                  : 'bg-slate-50 text-valere-blue-dark rounded-tl-none border border-slate-100'
              }`}>
                <ReactMarkdown components={{
                  strong: ({ children }) => <span className="font-bold text-inherit">{children}</span>,
                  p: ({ children }) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                }}>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
              <Loader2 className="w-4 h-4 text-valere-blue-dark animate-spin" />
              <span className="text-xs text-valere-ink/40 italic">Pensando...</span>
            </div>
          </div>
        )}
      </CardContent>

      <div className="p-3 border-t border-slate-100 bg-valere-paper/30">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pregúntame lo que necesites..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 focus:border-valere-blue-medium transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-valere-blue-dark text-white rounded-xl flex items-center justify-center hover:bg-valere-green-dark transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}
