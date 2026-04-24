# Plan Asistente del CRM — Ruta Estable Única

> Generado 2026-04-24 por Cowork. **Decisión arquitectónica**: ruta única, todo dentro del CRM, sin dependencias de UI externas.
> Caso de uso: compañeros de Valere consultan dudas sobre cómo usar el CRM. Asistente de documentación viva, no consultor energético abierto.

---

## Decisión arquitectónica

**Ruta estable única**: todo el asistente vive dentro del CRM, controlado por Valere, sin dependencias de productos externos específicos para la experiencia del usuario.

### Por qué NO usar NotebookLM como UI del asistente

NotebookLM es excelente como producto, pero como UI principal introduce **inestabilidad estructural**:

- **Producto externo de terceros**: si Google lo cambia/retira/encarece, perdéis la solución.
- **Dependencia de Workspace**: si en algún momento dejáis Workspace, perdéis la solución.
- **Re-educación posterior**: si los compañeros aprenden a consultar dudas en NotebookLM y luego se mete un widget integrado, hay que cambiarles la costumbre.
- **Calendario fuera de tu control**: las features y la disponibilidad las decide Google.

**NotebookLM se queda como herramienta personal opcional** para que Juan explore la documentación cuando esté escribiendo código, no como UI del equipo.

### Por qué SÍ ruta integrada en CRM

- **0 dependencia de productos externos específicos**: solo dependes de tu repo + tu Supabase + un modelo de IA cualquiera.
- **Doc viva donde vive el código**: `docs/help/` del repo. Cero riesgo de desincronización.
- **Modelo IA sustituible**: Gemini hoy, Claude mañana, OpenAI después — mismo endpoint cambiando ~10 líneas. Sin lock-in.
- **Una sola UI**: los compañeros aprenden a usar UN sitio para todo. Sin fricciones.
- **Robusta a cambios de proveedor**: cambiar de hosting (Cloudflare → AWS → otro), de modelo IA, de cuota — el flujo de usuario no cambia.

---

## Arquitectura objetivo

```
[Usuario en CRM]
       ↓
[Widget burbuja RAG]
       ↓
[Edge Function ask-crm-docs]
       ↓
[pgvector Supabase] ←──── [Pipeline embeddings (GitHub Action)]
       ↓                         ↑
[Adapter modelo IA]              │
       ↓                  [docs/help/*.md en repo]
[Modelo (Gemini hoy, sustituible)]
       ↓
[Respuesta con citas a docs]
```

**Principio de sustitución del modelo IA**: el adapter aísla el resto del sistema. Cambiar Gemini por Claude o GPT es modificar 1 fichero (~10 líneas), sin tocar el widget, el pipeline, los embeddings, ni la base de datos.

---

## Fase 1 — Estructura `docs/help/` y convenciones (4-6h)

**Objetivo**: tener una fuente única de verdad para la documentación del CRM con convenciones que permitan extracción automática.

### 1.1 Estructura

```
docs/help/
  ├── README.md                    # índice de la doc
  ├── empezando/
  │   ├── primer-acceso.md
  │   ├── interfaz-general.md
  │   └── configurar-perfil.md
  ├── empresas/
  │   ├── crear-empresa.md
  │   ├── editar-empresa.md
  │   ├── importar-csv.md
  │   └── custom-fields.md
  ├── contactos/
  │   └── ...
  ├── contratos/
  │   └── ...
  ├── oportunidades/
  │   ├── pipeline-kanban.md
  │   ├── etapas.md
  │   └── automatizaciones.md
  ├── actividades-y-calendario/
  │   └── ...
  ├── incidencias-y-renovaciones/
  │   └── ...
  ├── documentos/
  │   └── ...
  ├── notificaciones/
  │   └── ...
  ├── informes-y-exportacion/
  │   └── ...
  └── faqs/
      └── preguntas-frecuentes.md
```

### 1.2 Convenciones de cada `.md` (importantes para el RAG)

```markdown
---
title: Crear una empresa
section: empresas
audience: comerciales,admin
keywords: [empresa, cliente, alta, nuevo, crear, añadir]
related: [importar-csv, custom-fields, contactos/asociar-contacto]
---

# Crear una empresa

## Resumen rápido (1-2 líneas)
Para dar de alta una empresa nueva en el CRM, ir a "Empresas" → botón "+ Nueva empresa" → rellenar el formulario.

## Paso a paso
1. En el menú lateral, click en "Empresas".
2. Botón "+ Nueva empresa" arriba a la derecha.
3. Rellenar campos obligatorios:
   - **Nombre**: nombre comercial.
   - **NIF/CIF**: identificador fiscal.
   - **Comercial asignado**: por defecto, tú.
4. Click "Guardar".

## Errores frecuentes
- **"NIF ya existe"**: la empresa ya está dada de alta. Buscar por NIF en la lista.
- **"Campo obligatorio"**: revisar que todos los campos con asterisco están rellenos.

## Preguntas relacionadas
- ¿Cómo añadir contactos a una empresa?
- ¿Cómo importar muchas empresas de golpe?
- ¿Qué son los custom fields?
```

**Por qué esta estructura**:

- **Frontmatter** permite filtrar y categorizar en el RAG.
- **Resumen rápido** se prioriza para respuestas cortas.
- **Paso a paso** se cita literalmente cuando el usuario pregunta "cómo X".
- **Errores frecuentes** son las preguntas más comunes — el RAG las encuentra rápido.
- **Preguntas relacionadas** generan sugerencias contextuales en el widget.

### 1.3 Trabajo

Inventariar todas las features del CRM (las 27 fases + FASE 28) y escribir un `.md` por flujo importante. ~30-40 docs iniciales.

**Recomendación**: empezar con los 10 flujos más usados (crear empresa, crear oportunidad, mover en kanban, registrar actividad, etc.) y crecer.

---

## Fase 2 — Pipeline de embeddings (4-6h)

### 2.1 Activar pgvector

```sql
-- supabase/migrations/20260424_enable_pgvector_for_help.sql
create extension if not exists vector with schema extensions;
```

### 2.2 Tabla de embeddings

```sql
create table public.crm_help_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,            -- "docs/help/empresas/crear-empresa.md"
  section text not null,                -- "empresas"
  title text not null,                  -- del frontmatter
  chunk_index int not null,             -- 0, 1, 2... orden dentro del doc
  chunk_text text not null,
  embedding vector(768) not null,       -- text-embedding-004 dimensions
  source_url text,                      -- link a github o doc canónica
  created_at timestamptz default now()
);

create index on public.crm_help_embeddings using hnsw (embedding vector_cosine_ops);
create index on public.crm_help_embeddings (section);

alter table public.crm_help_embeddings enable row level security;
create policy "authenticated read" on public.crm_help_embeddings
  for select to authenticated using (true);
```

### 2.3 Función `match_crm_help`

```sql
create or replace function match_crm_help(
  query_embedding vector(768),
  match_count int default 5,
  filter_section text default null
)
returns table (
  source_path text,
  section text,
  title text,
  chunk_text text,
  source_url text,
  similarity float
)
language sql stable
as $$
  select
    source_path, section, title, chunk_text, source_url,
    1 - (embedding <=> query_embedding) as similarity
  from public.crm_help_embeddings
  where filter_section is null or section = filter_section
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### 2.4 Script de generación de embeddings

`scripts/generate-help-embeddings.mjs`:

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "fs/promises";
import path from "path";
import matter from "gray-matter";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genai.getGenerativeModel({ model: "text-embedding-004" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function chunkMarkdown(content, maxChars = 800) {
  // Chunk por secciones de markdown (headers ## / ###)
  // Si una sección es muy larga, partirla por párrafos
  // Mantener el header como contexto en cada chunk
  // ... implementación
}

async function processFile(filePath, basePath) {
  const raw = await readFile(filePath, "utf-8");
  const { data: frontmatter, content } = matter(raw);
  const chunks = await chunkMarkdown(content);
  const relativePath = path.relative(basePath, filePath);

  const embeddings = await Promise.all(
    chunks.map(async (chunk, i) => {
      const result = await embeddingModel.embedContent(chunk);
      return {
        source_path: relativePath,
        section: frontmatter.section || "general",
        title: frontmatter.title || "Sin título",
        chunk_index: i,
        chunk_text: chunk,
        embedding: result.embedding.values,
        source_url: `https://github.com/jolivares-valere/valere-v2/blob/main/${relativePath}`,
      };
    })
  );

  return embeddings;
}

async function main() {
  // 1. Leer todos los .md en docs/help/
  // 2. Procesar cada uno (chunking + embeddings)
  // 3. Borrar embeddings antiguos
  // 4. Insertar nuevos en batch
  console.log("Done");
}

main().catch(console.error);
```

### 2.5 GitHub Action

```yaml
# .github/workflows/regenerate-help-embeddings.yml
name: Regenerate CRM help embeddings
on:
  push:
    branches: [main]
    paths:
      - 'docs/help/**'

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: node scripts/generate-help-embeddings.mjs
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

**Resultado**: cada vez que un PR a `main` cambia `docs/help/**`, los embeddings se regeneran automáticamente. Doc → bot siempre sincronizado.

---

## Fase 3 — Edge Function `ask-crm-docs` (3-4h)

### 3.1 Adapter de modelo IA (clave para sustituibilidad)

`supabase/functions/_shared/ai-adapter.ts`:

```typescript
// Adapter abstracto. Cambiar de modelo = cambiar este archivo.
export interface AIAdapter {
  embed(text: string): Promise<number[]>;
  generate(prompt: string): Promise<string>;
}

export function createGeminiAdapter(): AIAdapter {
  // Implementación actual con @google/genai
}

// Ejemplo futuro:
// export function createClaudeAdapter(): AIAdapter { ... }
// export function createOpenAIAdapter(): AIAdapter { ... }

export function getAdapter(): AIAdapter {
  const provider = Deno.env.get("AI_PROVIDER") || "gemini";
  switch (provider) {
    case "gemini": return createGeminiAdapter();
    // case "claude": return createClaudeAdapter();
    // case "openai": return createOpenAIAdapter();
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
```

**Cambiar de modelo IA en el futuro** = cambiar `AI_PROVIDER` env var + asegurar que el nuevo adapter está implementado. Cero impacto en el resto del sistema.

### 3.2 Edge Function

```typescript
// supabase/functions/ask-crm-docs/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter } from "../_shared/ai-adapter.ts";

const SYSTEM_PROMPT = `Eres el asistente del CRM Valere. Ayudas a los compañeros de Valere Consultores a usar el CRM. Responde basándote SIEMPRE en la documentación adjunta. Si la respuesta no está en la doc, dilo claramente y sugiere preguntar al admin.

Reglas:
- Sé conciso. Respuestas de 1-3 frases si la pregunta es simple.
- Si das instrucciones paso a paso, numéralas.
- Cita las secciones de doc en las que te basas (al final de la respuesta).
- No inventes funcionalidades que no aparezcan en la doc.
- Idioma: castellano siempre.`;

Deno.serve(async (req) => {
  // Verificar JWT (verify_jwt: true en config.toml)
  const { question, section } = await req.json();
  if (!question || question.length > 500) {
    return new Response("Pregunta inválida", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const ai = getAdapter();

  // 1. Embedding de la pregunta
  const queryEmbedding = await ai.embed(question);

  // 2. Búsqueda semántica (filtra por sección si viene)
  const { data: chunks, error } = await supabase.rpc("match_crm_help", {
    query_embedding: queryEmbedding,
    match_count: 5,
    filter_section: section || null,
  });

  if (error || !chunks || chunks.length === 0) {
    return new Response(JSON.stringify({
      answer: "No encuentro información sobre eso en la documentación. Pregunta al admin del CRM.",
      sources: [],
    }), { headers: { "Content-Type": "application/json" } });
  }

  // 3. Construir prompt con contexto
  const context = chunks
    .map((c, i) => `[Fuente ${i + 1}: ${c.title} (${c.source_path})]\n${c.chunk_text}`)
    .join("\n\n");
  const fullPrompt = `${SYSTEM_PROMPT}\n\n## Documentación relevante\n${context}\n\n## Pregunta del usuario\n${question}`;

  // 4. Generar respuesta
  const answer = await ai.generate(fullPrompt);

  return new Response(JSON.stringify({
    answer,
    sources: chunks.map(c => ({
      title: c.title,
      path: c.source_path,
      url: c.source_url,
      similarity: c.similarity,
    })),
  }), { headers: { "Content-Type": "application/json" } });
});
```

### 3.3 Configuración

```toml
# supabase/functions/ask-crm-docs/config.toml
verify_jwt = true
```

Secret `GEMINI_API_KEY` configurado en Supabase Dashboard.

### 3.4 La Edge Function actual `chat-consultor` se RETIRA

Tras tener `ask-crm-docs` funcionando:

1. Verificar que el frontend del CRM no tiene referencias a `chat-consultor`.
2. Eliminar `supabase/functions/chat-consultor/` del repo.
3. En Supabase, despublicar la función `chat-consultor`.
4. Eliminar el secret `GEMINI_API_KEY` antiguo si era distinto del nuevo (rotación).

---

## Fase 4 — Widget RAG en CRM (3-4h)

### 4.1 Estructura

```
src/features/asistente-crm/
  ├── AsistentePanel.tsx          # botón flotante + panel
  ├── components/
  │   ├── ChatBubble.tsx          # un mensaje
  │   ├── SourcesCitation.tsx     # citas a docs
  │   └── SuggestedQuestions.tsx  # preguntas relacionadas
  ├── hooks/
  │   └── useAsistente.ts         # llamada Edge Function + state
  └── types.ts
```

### 4.2 Componente principal (resumen — implementación detallada en Fase C original)

```tsx
import { AsistentePanel } from "@/features/asistente-crm/AsistentePanel";

function App() {
  return (
    <>
      <Routes>...</Routes>
      <AsistentePanel />  {/* fuera del Routes — visible en todas las páginas */}
    </>
  );
}
```

### 4.3 Detección automática de sección actual

El widget detecta en qué página está el usuario y filtra el RAG por sección automáticamente. Si está en `/empresas`, las búsquedas se priorizan en `section: "empresas"`. Esto mejora la precisión sin que el usuario tenga que filtrar.

```tsx
const location = useLocation();
const section = location.pathname.split("/")[1]; // "empresas", "contratos", etc.

const { data } = await supabase.functions.invoke("ask-crm-docs", {
  body: { question, section },
});
```

### 4.4 Citas clicables

Las fuentes en la respuesta son links a la doc en GitHub (campo `source_url`). El usuario puede abrirlas para leer el contexto completo.

---

## Fase 5 — Evolución progresiva (continuo)

Una vez el widget RAG está vivo, evolucionar SEGÚN USO REAL:

- **Métrica 1**: ¿qué preguntas hacen los compañeros más a menudo?
  - Loguear preguntas anonimizadas en una tabla `asistente_log` (sin identificar usuario).
  - Revisar mensualmente: las top 10 preguntas indican qué documentación falta o qué tooltips/ayudas inline merecen el esfuerzo.

- **Métrica 2**: ¿cuándo el bot dice "no encuentro información"?
  - Esas preguntas son el TODO automático para escribir nueva documentación.

### Ayudas integradas que añadir según métricas

| Tipo | Cuándo añadir | Ejemplo |
|---|---|---|
| **Empty state explicativo** | Usuarios preguntan "no veo nada aquí" | "No hay empresas. Crea la primera con el botón + arriba." |
| **Tooltip en campo** | Usuarios preguntan qué significa un campo | "?" junto a "Probabilidad %" → "Estimación de cierre. 0% perdida, 100% ganada." |
| **Tour interactivo** | Nuevos compañeros se pierden la primera vez | Walkthrough de 5 pasos: dashboard → empresas → oportunidades → kanban → actividades. |
| **Mensaje de error mejorado** | Validation con texto críptico | "NIF ya existe" → "Esa empresa ya está dada de alta. Buscar por NIF aquí." |

**Coste**: ~2-3h por sprint para añadir 1-2 ayudas inline basadas en métricas reales.

**Por qué evolutivo y no de golpe**: añadir todas las ayudas al principio sin métricas reales acaba en mucho texto inútil que satura la UI. Mejor responder a uso real.

---

## Coste consolidado

| Fase | Coste | Cuándo |
|---|---|---|
| Fase 1 — Estructura `docs/help/` (10 docs iniciales) | 4-6h | Sprint dedicado |
| Fase 2 — Pipeline embeddings | 4-6h | Sprint dedicado |
| Fase 3 — Edge Function ask-crm-docs | 3-4h | Sprint dedicado |
| Fase 4 — Widget RAG | 3-4h | Sprint dedicado |
| Fase 5 — Evolución progresiva | 2-3h por sprint | Continuo |

**Total para tener algo funcional**: ~15-20h. ~3 días concentrados.

**Coste mensual operativo**: dentro del free tier de Gemini API mientras el uso sea bajo (5 compañeros, ~50 queries/día = sobra).

---

## Sustitución del modelo IA en el futuro

Si en algún momento quieres cambiar Gemini por Claude, OpenAI o cualquier otro:

1. Implementar el adapter nuevo en `supabase/functions/_shared/ai-adapter.ts`.
2. Configurar el secret nuevo en Supabase (`CLAUDE_API_KEY` o el que sea).
3. Cambiar la env var `AI_PROVIDER` a `claude` (o el nuevo).
4. Listo. Sin tocar pipeline, embeddings, frontend, ni base de datos.

**Salvedad**: si cambias de proveedor de embeddings (text-embedding-004 vs Voyage AI vs OpenAI ada-002), las dimensiones del vector pueden ser distintas. Eso obliga a regenerar todos los embeddings y a cambiar el tipo de la columna (`vector(768)` → `vector(1536)`). Es ~2h de migración. Mantener el mismo proveedor de embeddings durante el tiempo que se pueda.

---

## NotebookLM como herramienta personal de Juan (opcional)

Aunque no es la UI del asistente, NotebookLM puede ser útil para Juan cuando esté escribiendo nueva documentación:

- Subir `docs/help/` actualizado a un notebook personal.
- Hacer preguntas tipo "¿qué tema falta cubrir?" o "¿hay información duplicada entre `crear-empresa.md` e `importar-csv.md`?".
- Usar Audio Overviews para generar un audio de la doc completa cuando se metan compañeros nuevos.

Esto NO afecta a la arquitectura del asistente del CRM. Es solo herramienta de productividad personal.

---

## Pendientes antes de empezar

1. **Decidir si esta es la ruta** (este documento). ✅ Confirmado por Juan 2026-04-24.
2. **Unificación Supabase** debería estar hecha o en curso (no construir sobre 2 backends que se van a fusionar).
3. **Inventario completo de features del CRM** para escribir los 30-40 docs iniciales (2-3h de trabajo aparte por sprint).
4. **Decisión modelo IA inicial**: Gemini API free tier (recomendado para empezar) o ya integrado con OpenClaw para tarifa fija desde día 1.
5. **Eliminar el `chat-consultor` actual** (Edge Function huérfana) cuando esté listo el reemplazo.
