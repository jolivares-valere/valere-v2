# Edge Function `ask-crm-docs`

Endpoint del asistente RAG del CRM Valere. Reemplaza a `chat-consultor` (huérfana).

## Qué hace

1. Recibe `POST` con `{ question, section?, match_count? }`.
2. Genera embedding de la pregunta con `text-embedding-004`.
3. Busca los chunks más similares en `crm_help_embeddings` (via función `match_crm_help`).
4. Construye prompt con system prompt + contexto + pregunta.
5. Llama a Gemini `gemini-2.0-flash` (o el modelo configurado) para generar respuesta.
6. Devuelve `{ answer, sources, provider }`.

## Arquitectura — adapter sustituible

El archivo `_shared/ai-adapter.ts` aísla la interfaz con el modelo IA. Cambiar de Gemini a Claude/OpenAI/Vertex:

1. Implementar el adapter nuevo en `ai-adapter.ts`.
2. Configurar `AI_PROVIDER` env var (`gemini`, `claude`, etc.).
3. Configurar el secret correspondiente (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.).
4. Redeploy la función.

Cero impacto en frontend ni en pgvector. Si cambias el proveedor de embeddings, hay que regenerar los embeddings (distintas dimensiones).

## Deploy

### 1. Configurar secrets

```bash
supabase secrets set --project-ref gtphkowfcuiqbvfkwjxb \
  GEMINI_API_KEY="<tu-gemini-api-key>" \
  ALLOWED_ORIGIN="https://valere-v2.pages.dev"
```

Si vas a usar otro proveedor:

```bash
supabase secrets set --project-ref gtphkowfcuiqbvfkwjxb \
  AI_PROVIDER="claude" \
  ANTHROPIC_API_KEY="<tu-key>"
```

### 2. Deploy

```bash
supabase functions deploy ask-crm-docs --project-ref gtphkowfcuiqbvfkwjxb
```

### 3. Verificación

```bash
# Test con curl (requiere JWT válido de un usuario autenticado en Supabase)
curl -X POST https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/ask-crm-docs \
  -H "Authorization: Bearer $USER_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Cómo creo una empresa?"}'
```

Debería devolver JSON con `answer` y `sources`.

## Prerequisites (ya aplicados)

- ✅ Migration `20260424_fase2_rag_assistant_setup.sql` aplicada.
- ✅ Tabla `crm_help_embeddings` existe.
- ✅ Función `match_crm_help` existe.
- ✅ Extensión `pgvector` activada.

## Pipeline de embeddings

La tabla `crm_help_embeddings` se puebla automáticamente mediante `.github/workflows/regenerate-help-embeddings.yml` cuando se hace push a `main` con cambios en `docs/help/**`.

Si la tabla está vacía, la función responde "No encuentro información..." a todo.

Primera corrida manual:

```bash
# Desde GitHub → Actions → Regenerate CRM help embeddings → Run workflow
# O localmente:
GEMINI_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx \
  node scripts/generate-help-embeddings.mjs
```

## Monitorización

- Supabase Dashboard → Edge Functions → `ask-crm-docs` → Logs.
- Errores típicos a vigilar:
  - `GEMINI_API_KEY env var missing` — secret no configurado.
  - `Gemini embedding inválido: length=X, expected 768` — cambio en el modelo de embeddings.
  - `match_crm_help error` — problema RLS o tabla vacía.
