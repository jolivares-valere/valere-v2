# Plan asistente "Resolver dudas del CRM"

> Generado 2026-04-24 por Cowork. Plan en 2 fases: A inmediata (NotebookLM, 0 €), C integrada (Gemini API free tier en CRM).
> Casto de uso real: compañeros de Valere consultan dudas sobre cómo usar el CRM. Asistente de documentación viva, no consultor energético.

---

## Aclaración sobre coste

| Opción | Coste real | Encaja "sin token" |
|---|---|---|
| Gemini API estándar (AI Studio / Vertex) | Free tier generoso, después por token | ⚠️ Free tier sí, después no |
| Gemini Advanced en Workspace | 0 € (incluido) | ✅ Pero solo en UI Google, no API |
| NotebookLM Plus | 0 € (incluido en Workspace) | ✅ Pero usuario va a notebooklm.google.com |
| OpenClaw + ChatGPT Empresa | Tarifa fija ChatGPT | ✅ Sin tokens API |
| Anthropic API | Por token | ❌ |

**Realidad**: "Workspace incluye Gemini gratis" significa para usuarios humanos en herramientas Google, NO para apps externas que llaman API. Para widget en CRM, sin pasar por API por token, las opciones reales son **NotebookLM externo** o **OpenClaw como backend**.

---

## FASE A — NotebookLM como entrada al asistente (esta semana, 1h trabajo)

**Lo que se hace**:

1. Crear notebook nuevo en https://notebooklm.google.com con cuenta Workspace Valere.
2. Subir como sources:
   - `CLAUDE.md` del repo (contexto general).
   - `README.md` del repo.
   - Toda la carpeta `docs/` (manual de uso, decisiones de arquitectura, fases).
   - Cualquier doc adicional sobre cómo usar el CRM (si tienes manuales en Drive, también).
3. Compartir el notebook con los emails @valereconsultores.com del equipo.
4. En el CRM, añadir un botón visible (header o sidebar) "💬 Resolver dudas" que abre el notebook en pestaña nueva.

**Implementación en código**:

`src/components/layout/Sidebar.tsx` (o donde tengas el menú):

```tsx
<a
  href="https://notebooklm.google.com/notebook/<NOTEBOOK_ID>"
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100"
>
  <span>💬</span>
  <span>Resolver dudas del CRM</span>
</a>
```

Donde `<NOTEBOOK_ID>` lo sacas de la URL del notebook compartido.

**Cómo se actualiza la doc**:

- Cada vez que cambias algo del CRM, actualizas el `docs/` del repo.
- Una vez al mes, vas al notebook NotebookLM y "Refresh sources" → re-sube los docs actualizados desde Drive (si los sincronizas a Drive automáticamente con el script GitHub Actions del bonus abajo).

**Tiempo total**: 1h Juan + 0 línea código backend.

**Coste**: 0 €.

---

## FASE C — Widget integrado en CRM (en 1-2 semanas, opcional)

**Lo que se hace**:

Widget flotante "burbuja de chat" en el CRM, conectado a una Edge Function Supabase que hace RAG sobre los embeddings de la documentación.

**Arquitectura**:

```
[Widget CRM] → [Edge Function ask-crm-docs] → [pgvector Supabase]
                          ↓
                  [Gemini API free tier]
                          ↓
                  Respuesta con citas a docs
```

**Componentes a construir**:

### C.1 Activar pgvector en Supabase (5 min)

```sql
-- Aplicar como migration
create extension if not exists vector with schema extensions;
```

### C.2 Tabla de embeddings (10 min)

```sql
create table public.crm_docs_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,           -- ej: "docs/USO_CRM.md#crear-empresa"
  chunk_text text not null,            -- el fragmento de texto
  embedding vector(768) not null,      -- text-embedding-004 = 768 dims
  source_url text,                     -- ej: link al doc en Drive/GitHub
  created_at timestamptz default now()
);

create index on public.crm_docs_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.crm_docs_embeddings enable row level security;
create policy "authenticated read" on public.crm_docs_embeddings
  for select to authenticated using (true);
```

### C.3 Pipeline de generación de embeddings (4-6h)

GitHub Action que se dispara en push a `main` cuando cambian archivos en `docs/`:

```yaml
# .github/workflows/regenerate-embeddings.yml
name: Regenerate CRM docs embeddings
on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'CLAUDE.md'
      - 'README.md'

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: node scripts/generate-embeddings.mjs
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

`scripts/generate-embeddings.mjs`:
- Lee todos los `.md` en `docs/`, `CLAUDE.md`, `README.md`.
- Chunk inteligente por sección (parsing markdown headers).
- Llama Gemini API `text-embedding-004` por cada chunk.
- Borra embeddings antiguos + inserta nuevos en `crm_docs_embeddings`.

### C.4 Edge Function `ask-crm-docs` (3-4h)

```typescript
// supabase/functions/ask-crm-docs/index.ts
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

Deno.serve(async (req) => {
  const { question } = await req.json();
  const supabase = createClient(...);
  const genai = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY"));

  // 1. Generar embedding de la pregunta
  const embeddingModel = genai.getGenerativeModel({ model: "text-embedding-004" });
  const queryEmbedding = await embeddingModel.embedContent(question);

  // 2. Búsqueda semántica en pgvector (top 5 chunks)
  const { data: chunks } = await supabase.rpc("match_crm_docs", {
    query_embedding: queryEmbedding.embedding.values,
    match_count: 5,
  });

  // 3. Construir prompt con contexto + pregunta
  const context = chunks.map(c => `[${c.source_path}]\n${c.chunk_text}`).join("\n\n");
  const prompt = `
Eres el asistente del CRM Valere. Responde a la pregunta del usuario basándote en la documentación adjunta. Si la respuesta no está en la doc, dilo claramente. Cita las secciones de doc en las que te basas.

Documentación:
${context}

Pregunta del usuario:
${question}
`;

  // 4. Generar respuesta con gemini-2.0-flash
  const chatModel = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await chatModel.generateContent(prompt);

  return Response.json({
    answer: result.response.text(),
    sources: chunks.map(c => ({ path: c.source_path, url: c.source_url })),
  });
});
```

### C.5 Función `match_crm_docs` en Postgres (15 min)

```sql
create or replace function match_crm_docs(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  source_path text,
  chunk_text text,
  source_url text,
  similarity float
)
language sql stable
as $$
  select
    source_path, chunk_text, source_url,
    1 - (embedding <=> query_embedding) as similarity
  from public.crm_docs_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### C.6 Widget React en el CRM (3-4h)

`src/features/asistente-crm/AsistentePanel.tsx`:

```tsx
import { useState } from 'react';
import { supabase } from '@/core/supabase/client';

export function AsistentePanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string; content: string; sources?: any[]}>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const question = input;
    setInput("");
    setMessages(m => [...m, { role: "user", content: question }]);
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("ask-crm-docs", {
      body: { question },
    });

    if (error) {
      setMessages(m => [...m, { role: "assistant", content: "Lo siento, no he podido responder. Intenta de nuevo." }]);
    } else {
      setMessages(m => [...m, { role: "assistant", content: data.answer, sources: data.sources }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full w-14 h-14 shadow-lg hover:scale-105 transition flex items-center justify-center"
        aria-label="Resolver dudas del CRM"
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-lg shadow-2xl border flex flex-col">
          <header className="p-3 border-b font-semibold flex justify-between items-center">
            <span>Asistente del CRM</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900">×</button>
          </header>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">Pregúntame cualquier duda sobre el CRM.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : "text-left"}`}>
                <div className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-blue-100" : "bg-slate-100"}`}>
                  {m.content}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Fuentes: {m.sources.map((s: any) => s.path).join(", ")}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-sm text-slate-400">Pensando...</div>}
          </div>
          <footer className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 border rounded px-3 py-2 text-sm"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              Enviar
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
```

### C.7 Montar el widget en `App.tsx`

```tsx
import { AsistentePanel } from "@/features/asistente-crm/AsistentePanel";

function App() {
  return (
    <>
      <Routes>...</Routes>
      <AsistentePanel />  {/* fuera del Routes para que esté en todas las páginas */}
    </>
  );
}
```

### C.8 Coste real Gemini API free tier

Free tier (al 2026-04):
- `text-embedding-004`: 1500 req/día gratis.
- `gemini-2.0-flash`: 1.5 req/seg + 1M tokens/día gratis.

Para 5 usuarios con uso interno (digamos 50 preguntas/día por usuario = 250 queries/día):
- 250 embeddings de pregunta + ~5 retrievals + 250 generaciones = sobra de largo dentro del free tier.

Si en algún momento explota → upgrade a Vertex AI con cuota Workspace o pricing por token.

---

## FASE B — Alternativa con OpenClaw (si quieres tarifa fija garantizada)

Si en algún momento Fase C llega al límite de free tier, sustituir el backend por OpenClaw:

- En vez de Edge Function llamando Gemini API → llamar a Mission Control de OpenClaw.
- OpenClaw consulta ChatGPT con tu suscripción Empresa (sin tokens).
- Documentación cargada como knowledge base en OpenClaw o pasada en cada llamada.

Requiere setup OpenClaw + Mission Control + Cloudflare Tunnel (ver `docs/SETUP_OPENCLAW_MISSION_CONTROL.md`).

---

## Recomendación final

1. **Esta semana**: implementar Fase A (NotebookLM externo). 1h Juan, 0 línea código backend, valor inmediato.
2. **En 1-2 semanas**: implementar Fase C cuando tengamos la unificación Supabase encarrilada y haya capacidad. ~16h trabajo total.
3. **A futuro**: Fase B solo si Fase C llega a límites.

## Pendientes antes de Fase C

- Unificación Supabase debería estar hecha o en sprint avanzado (para no construir sobre 2 backends que se van a fusionar).
- Decisión sobre dónde vive la doc del CRM (`docs/` del repo es el sitio canónico — confirmar).
- Crear el componente `<Route>` para el panel chat-ia que está huérfano (o sustituirlo directamente por el widget nuevo).
