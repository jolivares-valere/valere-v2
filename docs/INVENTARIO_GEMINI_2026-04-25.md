# Inventario uso Gemini cross-app — 2026-04-25

> Sprint autónomo 5. Objetivo: identificar **antes de revocar** las 2 keys Gemini activas (`...R_Vs` y `...wqag`) qué aplicaciones del ecosistema Valere las usan, para no romper apps satélite.

## Contexto

Las 2 keys viven en el proyecto Google Cloud "Default Gemini Project" de la cuenta `valereconsultores.com`. La sesión 2026-04-24 (tarde) **pausó la revocación** porque sin inventario hay riesgo cross-app: si alguna otra app de Valere depende de una de las 2 keys, revocarla la rompe en silencio (los tests cliente-side no fallan hasta que un usuario invoca el LLM).

## Inventario en valere-v2 (este repo) — completo

| Ubicación | Tipo | Variable | Cómo se usa |
|---|---|---|---|
| `supabase/functions/_shared/ai-adapter.ts` | Server-side (Deno) | `Deno.env.get('GEMINI_API_KEY')` | Adapter usado por la Edge Function `ask-crm-docs` (asistente RAG). |
| `supabase/functions/ask-crm-docs/index.ts` | Server-side (Deno) | (vía adapter) | Endpoint del asistente. **Operativo en producción** (v9 ACTIVE, 12 consultas hoy). |
| `supabase/functions/chat-consultor/index.ts` | Server-side (Deno) | `Deno.env.get('GEMINI_API_KEY')` | Edge Function del **chat-ia huérfano** (sin ruta en frontend). v7 ACTIVE en Supabase pero inalcanzable. |
| `scripts/generate-help-embeddings.mjs` | Server-side (Node CI) | `process.env.GEMINI_API_KEY` (mapeada desde el secret GitHub `GEMINI_API_KEY_EMBEDDINGS`) | Pipeline que regenera embeddings cuando cambia `docs/help/`. Ya corrió: 216 embeddings cargados. |
| `src/features/chat-ia/ChatIAPanel.tsx` | Frontend (React) | **Ninguna** — invoca `supabase.functions.invoke('chat-consultor', …)` | No expone API key al cliente. |

**Conclusión valere-v2:** la API key vive **siempre server-side**. Cero exposición en el bundle frontend. La auditoría 2026-04-24 ya había confirmado este punto.

## Inventario apps satélite — incompleto, requiere a Juan

Las apps satélite **no están montadas** en el sandbox de Cowork; no se pueden inspeccionar desde aquí. Los datos disponibles vienen de docs cross-referenciadas en este repo:

| App | Repo | Uso esperado | Confirmado | Acción |
|---|---|---|---|---|
| `valere-gestion-potencias` | público o privado, no mounted | `VITE_GEMINI_API_KEY` en bundle frontend | ✅ Sí — `docs/AUDIT_SEGURIDAD_2026-04-24.md` línea 148 lo confirma | Refactor pendiente (ver `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`). **Probablemente usa una de las 2 keys.** |
| `valere-gestion-excedentes` | desconocido | desconocido | ❌ No verificado | Requiere `grep -ri GEMINI` desde PowerShell de Juan. |
| `valere-gestion-energetica` | privado `jolivares-valere/valere-gestion-energetica` | desconocido | ❌ No verificado | Requiere acceso PowerShell a la copia local. |

## Cómo cerrar el inventario (PowerShell)

```powershell
# Asumiendo que los repos satélite están en $HOME (ajustar nombres si es necesario)
foreach ($app in @("valere-gestion-potencias", "valere-gestion-excedentes", "valere-gestion-energetica")) {
  $path = "$HOME\$app"
  if (Test-Path $path) {
    Write-Host "=== $app ===" -ForegroundColor Cyan
    Get-ChildItem -Path $path -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.mjs,*.env*,*.yml,*.yaml |
      Select-String -Pattern "GEMINI|GoogleGenerativeAI|@google/genai|generativelanguage" -SimpleMatch |
      Select-Object Path, LineNumber, Line |
      Format-Table -AutoSize
  } else {
    Write-Host "[WARN] No existe: $path"
  }
}
```

Lo que hay que apuntar para cada hit:
- ¿Es **server-side** (Edge Function, API route, build script) o **frontend** (`VITE_*`, bundle público)?
- ¿Qué env var concreta lee (`GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`, `GOOGLE_API_KEY`, etc.)?
- ¿Está esa env var configurada en algún hosting (Vercel/Cloudflare/dashboards)?

Con esos datos se puede mapear key → app y decidir.

## Estrategia de revocación recomendada

**No revocar todavía** mientras `valere-gestion-potencias` siga usando `VITE_GEMINI_API_KEY`. Plan en orden:

1. **Cerrar inventario** (script de arriba) → mapa app→env var.
2. **Crear 1 key nueva por servicio** (mejor que reusar las 2 actuales):
   - `crm-asistente-prod` — para `ask-crm-docs` Edge Function (Supabase secret).
   - `crm-embeddings-ci` — para `regenerate-help-embeddings` GitHub Action.
   - Una por app satélite que la siga necesitando.
3. **Migrar cada consumidor** a su key dedicada (Supabase secrets, GitHub secrets, Vercel/Cloudflare env vars).
4. **Verificar 24-48h sin tráfico** sobre `...R_Vs` y `...wqag` en Google Cloud Console (Metrics → API & Services → Generative Language API).
5. **Revocar** las 2 viejas en Google AI Studio.
6. Si en algún momento durante 4. aparece tráfico, desandar y buscar al consumidor olvidado.

## Estado actual

- Asistente RAG ya consume **una sola** key (la que esté como `GEMINI_API_KEY` en Supabase secrets — confirmar cuál de las 2 mediante el dashboard).
- Pipeline embeddings idem (key como `GEMINI_API_KEY_EMBEDDINGS` en GitHub secrets — puede ser misma o distinta).
- Refactor potencias bloquea revocación.

## Riesgo de inacción

Mientras `valere-gestion-potencias` siga con la key en bundle, la key es abusable por cualquiera con DevTools. La mitigación de fondo es el refactor a serverless (`docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`). Mientras tanto el riesgo es:

- Coste no autorizado si se abusa de la API.
- Filtración a competencia / actor malicioso.

Ambos riesgos están documentados en `docs/AUDIT_SEGURIDAD_2026-04-24.md`. La acción mitigadora más rápida es **terminar el refactor de potencias** antes de tocar las keys.
