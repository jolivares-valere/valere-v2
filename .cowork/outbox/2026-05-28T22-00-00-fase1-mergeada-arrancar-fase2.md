# Fase 1 mergeada a main — próximo paso Fase 2

**Fecha:** 2026-05-28 (cierre tarde)
**Para:** próxima sesión de Cowork / Claude Code / Juan

## Estado del proyecto

🟣 **PR #10 mergeado a main.** Bloque 1 + Fase 1 del Módulo Tarifas y Propuestas Comerciales viven ahora en `main`.

## Lo que se hizo hoy

1. Aprobación inicial del Bloque 1 por ChatGPT (3 matices).
2. Cierre Fase 0 (saneamiento): tipos regenerados, fase 28.6 confirmada aplicada.
3. Briefing Fase 1 v1.1 con 4 correcciones ChatGPT integradas.
4. Creación de 10 ficheros (9 migraciones SQL aditivas + 1 test placeholder).
5. Aplicación de las 9 migraciones en Supabase prod via Chrome MCP.
6. Regeneración de tipos Supabase + commit final.
7. Verificación SQL final (1 RPC + 5 tablas confirmadas en prod).
8. **Squash and merge del PR #10 a main**.

## Qué tiene que hacer Juan antes de retomar

### 1. Sincronizar local
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git log --oneline -5
# Debería aparecer el commit squash "Claude/modulo tarifas propuestas (#10)" sobre 63a8abf
```

### 2. (Opcional) Borrar la rama obsoleta
```powershell
git branch -D claude/modulo-tarifas-propuestas
git push origin --delete claude/modulo-tarifas-propuestas
```
(Sólo si quieres limpiar — no urgente.)

### 3. Verificar TSC + tests sobre main actualizado
```powershell
npx tsc --noEmit
npm test -- --run
```
Esperado: 0 errores, 129 passed + 1 skipped.

### 4. Recopilar material no técnico (NEG-A ampliado)
Trabajo de Juan + equipo, en paralelo, antes de Fase 3:
- Renombrar archivos genéricos en Drive `TARIFAS_VIGENTES` para que el nombre incluya la comercializadora.
- Reenviarse 2-3 emails que contengan tarifas en el cuerpo del mensaje (no como adjunto).
- Cerrar catálogo de productos canónicos por comercializadora (sesión con un comercial veterano).
- Decidir cómo se gestiona Visalia (PDF imagen → sólo Gemini visual, o canal alternativo).

### 5. Recopilar material NEG-B (bloquea Fase 5)
- Logo Valere alta resolución (PNG transparente + SVG).
- Colores corporativos (hex).
- Tipografía oficial.
- Propuesta comercial de referencia que le guste a Juan.

## Cuándo arrancar Fase 2

**Sólo cuando Juan diga "arranca Fase 2".** No anticipar.

Cuando lo diga, Cowork prepara `docs/BRIEFING_FASE2_TARIFFS_INGEST.md` con:

### Contenido del briefing Fase 2 (esbozo)

**Objetivo:** Make deja de "razonar" y sólo capta. El backend (Edge Function) hace todo lo demás.

**Pieza nueva:** Edge Function `supabase/functions/tariffs-ingest/index.ts`.

**Patrón:** clonar `chat-consultor` con estos cambios:
- Auth alternativa: header `X-Valere-Ingest-Token` con secret compartido `MAKE_INGEST_TOKEN` (Make no tiene JWT de usuario).
- Body esperado:
  ```json
  {
    "source": "gmail_make",
    "email_id": "...",
    "sender_email": "...",
    "subject": "...",
    "received_at": "ISO datetime",
    "drive_file_id": "...",
    "drive_url": "...",
    "file_name": "...",
    "mime_type": "...",
    "file_size_bytes": 0,
    "sha256": "..."
  }
  ```
- Lógica:
  1. Validar token compartido.
  2. Si `sha256` viene y existe en `tariff_documents` → responder `{status:"duplicate", existing_id}`.
  3. Insert en `tariff_documents` con `status='received'`.
  4. (Opcional) disparar `tariffs-extract` async via `pg_net` o cola — recomendación: NO al principio, dejar manual desde la bandeja.
  5. Responder `{status:"accepted", document_id}`.

**Modificar escenario Make:**
- NO tocar lo que ya funciona (watch emails + filtros + listing + filtro extension/type + upload Drive).
- Añadir UN sólo módulo HTTP al final: POST a `https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/tariffs-ingest` con headers `X-Valere-Ingest-Token` + body con metadatos.

**Tests Edge Function:**
- Token inválido → 401.
- Body inválido → 400.
- Documento nuevo → 201 + fila en `tariff_documents`.
- Documento con SHA repetido → 200 con `status:"duplicate"`.

**Reglas duras Fase 2:**
- NO crear UI nueva todavía (la bandeja de validación es Fase 3).
- NO llamar a Gemini todavía (extracción IA es Fase 3).
- NO tocar `comercializadora_ofertas`, ni el RPC, ni `XLSXImportadorTarifas`.

## Aprobaciones acumuladas para Fase 1 (cerrar)

- ChatGPT Ronda 1: Plan + Análisis + 3 matices integrados.
- ChatGPT Ronda 2: Briefing v1.1 con 4 correcciones técnicas integradas.
- ChatGPT Ronda 3: PR #10 aprobado tras verificación SQL final.

## Riesgos a vigilar para Fase 2

1. **Secret `MAKE_INGEST_TOKEN`** debe configurarse en Supabase secrets ANTES de desplegar la Edge Function. No pasar el token en repo.
2. **Webhook URL pública** desde Make a Supabase Functions debe respetar CORS y rate-limit. La Edge Function debe rechazar peticiones sin el token.
3. **`sha256` puede no llegar de Make.** Si Make no calcula hash, el dedup debe degradar a `(file_name, file_size_bytes)`. Documentar el fallback claramente.
4. **Mantenimiento Supabase eu-west-1** — verificar agenda antes de desplegar.
