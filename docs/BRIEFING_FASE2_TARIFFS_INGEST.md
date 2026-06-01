# Briefing Fase 2 — tariffs-ingest + esios-price-cache

> **Versión:** 1.0  
> **Fecha:** 2026-06-01  
> **Para:** Claude Code (CLI)  
> **Estado:** Listo para implementar — esqueletos creados por Cowork

---

## Contexto

La Fase 1 creó el schema de base de datos para el módulo de tarifas (9 migraciones, aplicadas en prod, PR #10 mergeado a `main`). La Fase 2 conecta ese schema con el mundo exterior:

- **`tariffs-ingest`**: endpoint que Make llama cuando llega un email con tarifa. Registra el documento en `tariff_documents`.
- **`esios-price-cache`**: cron job nightly que descarga precios horarios de ESIOS (REE) y los cachea en `precios_pool_horarios`.

Ambas Edge Functions están **ya escritas** en `supabase/functions/`. Tu trabajo en Fase 2 es:
1. Aplicar la migración SQL nueva.
2. Revisar, ajustar y hacer deploy de las dos Edge Functions.
3. Configurar los secrets necesarios.
4. Ejecutar el backfill histórico de precios ESIOS.
5. Verificar que todo funciona.

---

## Archivos nuevos en este sprint

```
supabase/migrations/20260601_esios_precios_pool.sql   ← Tabla precios_pool_horarios
supabase/functions/tariffs-ingest/index.ts             ← Edge Function Make→Supabase
supabase/functions/esios-price-cache/index.ts          ← Edge Function cron ESIOS
docs/ANALISIS_ESIOS_INTEGRACION.md                     ← Referencia técnica ESIOS
```

---

## Paso 1 — Aplicar migración SQL en Supabase

Ejecutar en el SQL Editor de Supabase (proyecto `gtphkowfcuiqbvfkwjxb`):

```sql
-- Copiar y pegar el contenido de:
-- supabase/migrations/20260601_esios_precios_pool.sql
```

Verificar que la tabla existe:

```sql
select tablename from pg_tables
where schemaname = 'public' and tablename = 'precios_pool_horarios';
```

Debe devolver 1 fila.

---

## Paso 2 — Revisar tariffs-ingest antes del deploy

Abrir `supabase/functions/tariffs-ingest/index.ts` y verificar que los campos del `.insert()` coinciden con las columnas reales de `tariff_documents` (definida en `supabase/migrations/20260528_modulo_tarifas_03_documents.sql`):

La tabla real tiene:
- `source` (obligatorio, check: `gmail_make|manual_upload|retailer_crm`) — **añadir `source: 'gmail_make'`** al insert
- `email_id`, `sender_email`, `subject`, `received_at`, `drive_file_id`, `drive_url`, `file_name`, `mime_type`, `file_size_bytes`, `sha256`, `status`, `error_message`, `notes`

Ajustar el payload y el insert para mapear correctamente:

```typescript
// Correcciones a aplicar en tariffs-ingest/index.ts:
// - payload.filename  → file_name (nombre de columna real)
// - payload.email_from → sender_email
// - payload.email_subject → subject
// - payload.email_date → received_at
// - añadir source: 'gmail_make'
// - status inicial: 'received' (no 'pendiente' — ver check constraint)
```

---

## Paso 3 — Deploy de las Edge Functions

```bash
# Desde el directorio del proyecto, con supabase CLI autenticado:
supabase functions deploy tariffs-ingest --project-ref gtphkowfcuiqbvfkwjxb
supabase functions deploy esios-price-cache --project-ref gtphkowfcuiqbvfkwjxb
```

Si no tienes la CLI configurada, deployar desde el Dashboard de Supabase:
- Edge Functions → New function → pegar el contenido del archivo

---

## Paso 4 — Configurar secrets en Supabase

Via CLI:
```bash
supabase secrets set MAKE_INGEST_TOKEN=<generar_uuid_aleatorio> \
  --project-ref gtphkowfcuiqbvfkwjxb

supabase secrets set ESIOS_API_KEY=<token_que_tiene_Juan> \
  --project-ref gtphkowfcuiqbvfkwjxb
```

Via Dashboard: Settings → Edge Functions → Secrets.

**`MAKE_INGEST_TOKEN`**: generar un UUID v4 aleatorio (`uuidgen` en Mac/Linux o `[System.Guid]::NewGuid()` en PowerShell). Guardar el valor — Juan lo necesita para configurar Make.

**`ESIOS_API_KEY`**: el token personal de ESIOS que Juan ya tiene.

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son automáticos — no hace falta configurarlos.

---

## Paso 5 — Configurar cron job para esios-price-cache

En el Dashboard de Supabase → Edge Functions → `esios-price-cache` → Schedule:

```
30 20 * * *
```

(Equivale a 21:30 CET en invierno / 22:30 CEST en verano)

Alternativamente, via `pg_cron` si está disponible en el plan:

```sql
select cron.schedule(
  'esios-nightly',
  '30 20 * * *',
  $$
    select net.http_post(
      url := 'https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/esios-price-cache',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )
  $$
);
```

---

## Paso 6 — Backfill histórico ESIOS (24 meses)

Una vez deployed y con los secrets configurados, ejecutar el backfill con una llamada manual:

```bash
curl -X POST \
  "https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/esios-price-cache" \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2024-01-01", "end_date": "2024-12-31"}'

# Luego el segundo año:
curl -X POST \
  "https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/esios-price-cache" \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-01-01", "end_date": "2025-12-31"}'
```

El backfill de un año tarda ~30-60 segundos por indicador (5 indicadores × 8.760 horas = ~43.800 filas por año).

Verificar resultado:

```sql
select
  indicador_id,
  indicador_nom,
  count(*) as filas,
  min(hora_utc) as desde,
  max(hora_utc) as hasta
from precios_pool_horarios
group by indicador_id, indicador_nom
order by indicador_id;
```

---

## Paso 7 — Verificar tariffs-ingest

Probar con curl simulando lo que haría Make:

```bash
curl -X POST \
  "https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/tariffs-ingest" \
  -H "x-ingest-token: {MAKE_INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "drive_file_id": "test-123",
    "filename": "ENDESA_3TD_MAYO2026.pdf",
    "comercializadora": "Endesa",
    "email_subject": "Tarifa actualizada mayo 2026",
    "email_from": "tarifas@endesa.es",
    "email_date": "2026-06-01T10:00:00Z",
    "sha256": "abc123def456"
  }'
```

Respuesta esperada:
```json
{ "ok": true, "duplicado": false, "document_id": "uuid...", "mensaje": "Documento registrado correctamente" }
```

Verificar en Supabase:
```sql
select id, file_name, source, status, created_at
from tariff_documents
order by created_at desc
limit 5;
```

---

## Paso 8 — Tests

Añadir tests en `src/features/admin/__tests__/` o `supabase/functions/`:

```typescript
// Test mínimo: verificar que esios-price-cache devuelve estructura correcta
// Test mínimo: verificar dedup de tariffs-ingest (mismo sha256 → duplicado:true)
// Test mínimo: verificar que tariffs-ingest rechaza token inválido (401)
```

---

## TSC y build antes de commit

```bash
npx tsc --noEmit   # Debe dar 0 errores
npm test -- --run  # Deben pasar 39/39
npm run build      # Debe completar sin errores
```

Las Edge Functions son Deno (no TypeScript del proyecto), así que el TSC del repo no las toca. Pero si añades código en `src/core/services/esios.ts` (el cliente TypeScript), sí debe pasar TSC.

---

## Secrets necesarios — resumen

| Secret | Quién lo genera | Dónde se configura |
|---|---|---|
| `MAKE_INGEST_TOKEN` | Claude Code (`uuidgen`) | Supabase secrets + Make |
| `ESIOS_API_KEY` | Juan (ya lo tiene) | Supabase secrets |

---

## Referencias

- `supabase/functions/esios-price-cache/index.ts` — Edge Function ESIOS (ya escrita)
- `supabase/functions/tariffs-ingest/index.ts` — Edge Function Make (ya escrita, revisar mapeo)
- `supabase/migrations/20260601_esios_precios_pool.sql` — Migration tabla caché
- `supabase/migrations/20260528_modulo_tarifas_03_documents.sql` — Schema `tariff_documents`
- `docs/ANALISIS_ESIOS_INTEGRACION.md` — Referencia completa indicadores ESIOS

---

## Notas para Cowork (tras Fase 2)

Una vez Fase 2 desplegada, Cowork implementará:
- Widget dashboard "Precio pool hoy" (leer de `precios_pool_horarios`)
- Integración `calculator.ts` para tarifas indexadas
- UI en AnalisisPage para mostrar coste real vs alternativa

Eso será el arranque de **Fase 3**.
