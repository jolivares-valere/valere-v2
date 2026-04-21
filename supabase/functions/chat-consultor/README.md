# Edge Function `chat-consultor`

Proxy entre el cliente y Google Gemini API. Mantiene la API key fuera del navegador.

## Flujo

```
Browser (ChatIAPanel)
  → supabase.functions.invoke('chat-consultor', { body: { messages, systemPrompt } })
  → Edge Function (este archivo)
  → Google Gemini API (gemini-2.0-flash-exp)
```

## Secrets requeridos

Configurar en **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

| Secret | Valor | Obligatorio |
|--------|-------|:-:|
| `GEMINI_API_KEY` | Tu API key de Google AI Studio | ✅ |
| `ALLOWED_ORIGIN` | URL del frontend (ej. `https://valere.app` o `http://localhost:3000`) | Recomendado |

Si `ALLOWED_ORIGIN` no se configura, por defecto es `http://localhost:5173`.

## Deploy

### Primera vez (requiere Supabase CLI)

```bash
# 1. Instalar CLI si no la tienes
npm i -g supabase

# 2. Login
supabase login

# 3. Enlazar con el proyecto (una vez por máquina)
cd ~/valere-v2
supabase link --project-ref <PROJECT_REF>
# El ref lo ves en la URL del dashboard: https://supabase.com/dashboard/project/<PROJECT_REF>

# 4. Configurar secrets (una vez)
supabase secrets set GEMINI_API_KEY=tu-api-key-aqui
supabase secrets set ALLOWED_ORIGIN=http://localhost:3000
# Para producción, usar la URL real.

# 5. Deploy
supabase functions deploy chat-consultor
```

### Deploys posteriores

```bash
supabase functions deploy chat-consultor
```

Los secrets persisten; solo se vuelven a configurar si se rotan.

## Verificación post-deploy

```bash
# Desde la terminal (requiere jq para pretty-print)
curl -i -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/chat-consultor" \
  -H "Authorization: Bearer <ANON_KEY_O_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola"}]}'
```

Respuesta esperada: `200 OK` con `{ "text": "..." }`. Si devuelve `401`, la JWT no es válida. Si `500` con `GEMINI_API_KEY not configured`, el secret falta.

## Endurecimiento ya aplicado

- ✅ CORS restringido al origin configurado (no wildcard).
- ✅ JWT verification: rechaza llamadas sin header `Authorization`.
- ✅ Validación de entrada: máximo 50 mensajes, array no vacío.
- ✅ API key de Gemini jamás sale al cliente.

## Pendiente (no bloqueante)

- **Rate limiting**: actualmente un usuario autenticado puede llamar ilimitadas veces. Para v1 es aceptable (el coste está limitado por la key de Gemini). Para endurecer, añadir tabla `chat_rate_limit (user_id, window_start, count)` en Supabase y verificar aquí antes de invocar Gemini.
- **Streaming SSE**: ahora la respuesta llega completa. Para mejor UX (tokens llegando progresivamente), cambiar `generateContent` por `generateContentStream` y devolver `text/event-stream`. Requiere también cambio en el cliente.

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| Cliente recibe `FunctionsHttpError: Failed to fetch` | Function no desplegada | `supabase functions deploy chat-consultor` |
| `500 GEMINI_API_KEY not configured` | Secret no está en Supabase | `supabase secrets set GEMINI_API_KEY=...` |
| `401 Missing authorization header` | El cliente no está autenticado | Login primero |
| CORS error en consola del navegador | `ALLOWED_ORIGIN` no coincide con el frontend | Revisar dashboard → secrets |
| Respuestas lentas (>10s) | Gemini API saturada | Esperar o cambiar modelo a `gemini-1.5-flash` |
