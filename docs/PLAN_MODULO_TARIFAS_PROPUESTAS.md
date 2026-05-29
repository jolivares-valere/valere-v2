# Plan de implementación — Módulo Tarifas y Propuestas Comerciales

> **Fecha:** 2026-05-27 (v1.1 — addendum tras análisis de formatos reales y aprobación de ChatGPT)
> **Autor:** Claude (Cowork) — sesión proyecto CRM VALERE
> **Documentos previos (obligatorios):**
> - [`AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md`](AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md) — estado real del repo
> - [`ANALISIS_FORMATOS_TARIFAS.md`](ANALISIS_FORMATOS_TARIFAS.md) — formatos reales de tarifas recibidas en Drive (modifica el alcance de Fase 1)
> **Estado:** Bloque 1 aprobado por ChatGPT con 3 matices integrados (ver §14). Pendiente de Juan ejecutar Fase 0.

> **⚠️ ADDENDUM v1.1 (importante):** Tras analizar 8 archivos reales en `TARIFAS_VIGENTES`, el alcance del modelo de datos de Fase 1 se ha ampliado. La migración de extensión de `comercializadora_ofertas` pasa de ~10 columnas a ~25 columnas nuevas + 2 sub-tablas (PyS, precios mensuales gas). Detalle completo en `ANALISIS_FORMATOS_TARIFAS.md` §5 y §6. Las secciones de este PLAN se mantienen como guía estructural; los detalles de columnas se consolidarán en el briefing concreto que Cowork prepare para Claude Code antes de Fase 1.

---

## 0. Filosofía del plan

1. **No partir de cero.** Toda fase asume que se completa o se conecta lo que ya existe; nunca se duplica.
2. **Humano-en-el-bucle desde el día uno.** Volumen 30-40 tarifas/mes → IA propone, comercial valida.
3. **Make solo captura.** No se vuelve a tocar la lógica interna del escenario Make; sólo se le añade un paso HTTP final.
4. **Edge Functions sobre FastAPI.** Decisión cerrada (ver auditoría §4).
5. **Gemini server-side siempre.** Patrón `chat-consultor` como base.
6. **Migraciones aditivas.** Nada de RENAME ni DROP sobre `comercializadora_ofertas` ni `proposals`. Sólo ADD COLUMN.
7. **Cada fase entrega valor por sí sola** y se puede pausar entre fases sin dejar el sistema roto.
8. **Tests obligatorios** desde Fase 2 (el motor de cálculo extendido se testea).

---

## 1. Estructura del trabajo

El módulo se descompone en **8 fases**. Las 6 primeras son técnicas. Las 2 últimas (catálogo y plantilla) son trabajo de negocio que Juan + equipo Valere pueden hacer en paralelo a las fases 0-3.

| Fase | Nombre | Duración estimada | Bloquea a |
|---|---|---|---|
| **F0** | Saneamiento previo | 0.5 día | Todas |
| **F1** | Modelo de datos — extensión y tablas nuevas | 1 día | F2, F3 |
| **F2** | Edge Function `tariffs-ingest` + Make webhook | 1 día | F3, F4 |
| **F3** | Edge Function `tariffs-extract` + bandeja validación | 2-3 días | F5 |
| **F4** | Versionado + histórico de ofertas | 1 día | F5 |
| **F5** | Generador PDF de propuesta corporativa | 2-3 días | F6 |
| **F6** | Email con aprobación manual | 1 día | — |
| **NEG-A** | Catálogo productos + decisiones de negocio | 2-4 horas con equipo | F3 |
| **NEG-B** | Diseño plantilla propuesta Valere | 1-3 días (negocio) | F5 |

**Camino crítico:** F0 → F1 → F2 → F3 → F4 → F5 → F6.

**Trabajo paralelo:** NEG-A puede empezar el día 1 (lo hace Juan + 1 comercial). NEG-B puede empezar el día 1 (Juan + diseñador o herramienta IA).

---

## 2. Fase 0 — Saneamiento previo

Antes de tocar nada del módulo, cerrar pendientes que afectan al alcance.

### F0.1 — Push del commit local `60ab260`
**Quién:** Juan (PowerShell).
**Qué:**
```powershell
cd C:\Users\joliv\valere-v2
git status
git log --oneline -3
git push origin main
```
**Por qué:** el commit Hito 2 Factura Teórica está en local sin pushear. Antes de abrir rama nueva conviene tener `main` sincronizado.

### F0.2 — Ejecutar SQL fase 28.6 RLS cleanup
**Quién:** Juan (Dashboard Supabase SQL editor).
**Qué:** ejecutar `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` en `gtphkowfcuiqbvfkwjxb`.
**Por qué:** antes de añadir policies RLS nuevas para tablas del módulo, limpiar las existentes evita conflictos.

### F0.3 — Regenerar tipos Supabase
**Quién:** Juan o Claude Code (CLI Supabase requerida).
**Qué:**
```powershell
cd C:\Users\joliv\valere-v2
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts
```
**Por qué:** los tipos actuales muestran `retailers/retailer_offers` (nombre antiguo) pero el código vivo usa `comercializadoras/comercializadora_ofertas`. Si arrancamos el módulo sin regenerar, vamos a arrastrar `(supabase as any)` casts.

### F0.4 — Abrir rama de trabajo
**Quién:** Juan.
**Qué:**
```powershell
git checkout -b claude/modulo-tarifas-propuestas
git push -u origin claude/modulo-tarifas-propuestas
```
**Por qué:** convención del repo (rama `claude/<descripcion>` para cualquier feature, ver `CLAUDE.md`).

### F0.5 — Verificar TSC + tests verdes en `main`
**Quién:** Juan o Claude Code.
**Qué:**
```powershell
npx tsc --noEmit
npm test -- --run
```
**Esperado:** 0 errores TSC, 39/39 tests. Si no, no se arranca la fase 1 hasta arreglar.

---

## 3. Fase 1 — Modelo de datos

**Objetivo:** dejar el schema listo para soportar todas las fases posteriores.

### F1.1 — Migración: extensión `comercializadora_ofertas`

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_extension_ofertas.sql`

**Contenido (resumen):**

```sql
-- Vigencia y estados
alter table public.comercializadora_ofertas
  add column if not exists valid_from        date,
  add column if not exists valid_to          date,
  add column if not exists status            text default 'published'
    check (status in ('pending_validation','published','superseded','rejected','draft')),
  add column if not exists version           int  default 1,
  add column if not exists superseded_by     uuid references public.comercializadora_ofertas(id);

-- Trazabilidad IA
alter table public.comercializadora_ofertas
  add column if not exists source_document_id uuid,  -- FK se añade en migración F1.3
  add column if not exists extracted_by_ai    bool default false,
  add column if not exists confidence_score   numeric;

-- Validación humana
alter table public.comercializadora_ofertas
  add column if not exists validated_by  uuid references public.user_profiles(id),
  add column if not exists validated_at  timestamptz;

-- Índices necesarios
create index if not exists idx_comercializadora_ofertas_vigentes
  on public.comercializadora_ofertas (comercializadora_id, product_name, access_rate)
  where status = 'published' and (valid_to is null or valid_to >= current_date);

create index if not exists idx_comercializadora_ofertas_status
  on public.comercializadora_ofertas (status);

-- Backfill: todas las ofertas existentes se consideran publicadas y sin caducidad
update public.comercializadora_ofertas
   set status = coalesce(status, 'published'),
       version = coalesce(version, 1)
 where status is null or version is null;
```

**Riesgos:** ninguno. Sólo ADD COLUMN + UPDATE de backfill. El comparador (`AnalisisPage`) sigue funcionando porque su query `.eq('include_in_comparison', true)` no usa los nuevos campos.

### F1.2 — Migración: campo `logo_url` en comercializadoras

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_logo_comercializadora.sql`

```sql
alter table public.comercializadoras
  add column if not exists logo_url text,
  add column if not exists web      text,
  add column if not exists email_contacto text,
  add column if not exists agente_referencia text;
```

**UI a tocar:** `src/features/admin/AdminPage.tsx` (`RetailersTab`) — añadir input upload de logo (storage bucket `comercializadora-logos`, crear si no existe).

### F1.3 — Migración: tabla `tariff_documents`

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_documents.sql`

```sql
create table if not exists public.tariff_documents (
  id              uuid primary key default gen_random_uuid(),
  source          text not null check (source in ('gmail_make','manual_upload','retailer_crm')),
  email_id        text,           -- Gmail Message-ID si viene de Make
  sender_email    text,
  subject         text,
  received_at     timestamptz default now(),
  drive_file_id   text,           -- ID Drive del archivo
  drive_url       text,
  file_name       text,
  mime_type       text,
  file_size_bytes bigint,
  sha256          text unique,    -- dedup exacto
  status          text not null default 'received'
    check (status in (
      'received',           -- recién llegado
      'duplicate_exact',    -- mismo SHA ya existe
      'pending_extraction', -- esperando IA
      'extracted',          -- IA ya extrajo
      'pending_validation', -- esperando comercial
      'validated',          -- comercial validó y se creó/actualizó oferta
      'rejected',           -- comercial descartó
      'error'               -- fallo de extracción
    )),
  error_message text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- FK pendiente desde comercializadora_ofertas.source_document_id
alter table public.comercializadora_ofertas
  add constraint fk_oferta_source_document
  foreign key (source_document_id) references public.tariff_documents(id);

create index idx_tariff_documents_status on public.tariff_documents(status);
create index idx_tariff_documents_sha    on public.tariff_documents(sha256);

-- RLS
alter table public.tariff_documents enable row level security;

-- Policy: usuarios aprobados pueden leer y escribir
create policy "approved_users_select_tariff_documents"
  on public.tariff_documents for select
  using (auth.uid() in (select id from public.user_profiles where approved = true));

create policy "approved_users_insert_tariff_documents"
  on public.tariff_documents for insert
  with check (auth.uid() in (select id from public.user_profiles where approved = true));

create policy "approved_users_update_tariff_documents"
  on public.tariff_documents for update
  using (auth.uid() in (select id from public.user_profiles where approved = true));
```

### F1.4 — Migración: tabla `tariff_extractions`

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_extractions.sql`

```sql
create table if not exists public.tariff_extractions (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.tariff_documents(id) on delete cascade,
  model_name          text not null,     -- ej "gemini-2.5-flash-lite"
  raw_response_json   jsonb,             -- respuesta cruda de Gemini
  structured_json     jsonb,             -- payload parseado
  confidence_score    numeric,           -- 0-1
  proposed_action     text check (proposed_action in ('create_new','update_existing','duplicate','reject')),
  proposed_oferta_id  uuid references public.comercializadora_ofertas(id),  -- si update_existing
  status              text not null default 'pending'
    check (status in ('pending','validated','rejected','error')),
  error_message       text,
  created_at          timestamptz default now(),
  validated_by        uuid references public.user_profiles(id),
  validated_at        timestamptz
);

create index idx_tariff_extractions_doc on public.tariff_extractions(document_id);

alter table public.tariff_extractions enable row level security;

create policy "approved_users_all_tariff_extractions"
  on public.tariff_extractions for all
  using (auth.uid() in (select id from public.user_profiles where approved = true))
  with check (auth.uid() in (select id from public.user_profiles where approved = true));
```

### F1.5 — Migración: extensión `proposals`

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_proposals_extension.sql`

```sql
alter table public.proposals
  add column if not exists empresa_id   uuid references public.empresas(id),
  add column if not exists contacto_id  uuid references public.contactos(id),
  add column if not exists comercial_id uuid references public.user_profiles(id),
  add column if not exists approved_by  uuid references public.user_profiles(id),
  add column if not exists approved_at  timestamptz,
  add column if not exists sent_at      timestamptz,
  add column if not exists status_v2    text default 'draft'
    check (status_v2 in ('draft','pending_review','approved','sent','rejected'));
-- Nota: 'status_v2' provisional para no chocar con 'status' actual sin enum.
-- En F5/F6 se decidirá migrar el viejo a v2 o mantener ambos.
```

### F1.6 — Migración: tabla `proposal_email_drafts`

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_email_drafts.sql`

```sql
create table if not exists public.proposal_email_drafts (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references public.proposals(id) on delete cascade,
  to_email      text not null,
  cc_email      text,
  bcc_email     text,
  subject       text not null,
  body_html     text not null,
  body_text     text,            -- versión texto plano
  status        text not null default 'draft'
    check (status in ('draft','pending_review','approved','sent','rejected','error')),
  created_by    uuid references public.user_profiles(id),
  approved_by   uuid references public.user_profiles(id),
  approved_at   timestamptz,
  sent_at       timestamptz,
  error_message text,
  resend_message_id text,        -- ID de Resend tras envío
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_email_drafts_proposal on public.proposal_email_drafts(proposal_id);
create index idx_email_drafts_status   on public.proposal_email_drafts(status);

alter table public.proposal_email_drafts enable row level security;

create policy "approved_users_all_email_drafts"
  on public.proposal_email_drafts for all
  using (auth.uid() in (select id from public.user_profiles where approved = true))
  with check (auth.uid() in (select id from public.user_profiles where approved = true));
```

### F1.7 — Regenerar tipos TS y verificar

**Quién:** Juan o Claude Code.
**Qué:**
```powershell
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts
npx tsc --noEmit
npm test -- --run
```
**Esperado:** 0 errores, 39/39 tests, las nuevas tablas y columnas aparecen en `database.ts`.

---

## 4. Fase 2 — Ingesta `tariffs-ingest`

**Objetivo:** Make deja de "hacer cosas" y simplemente avisa al backend cuando un documento llega.

### F2.1 — Edge Function `tariffs-ingest`

**Archivo nuevo:** `supabase/functions/tariffs-ingest/index.ts`

**Patrón:** clonar de `chat-consultor` con estos cambios:

- **Auth alternativa.** Make no tiene JWT de usuario. Opciones:
  - (a) usar el `service_role` key como bearer (lo más simple — el secret se configura en Make una vez).
  - (b) montar un endpoint con un token compartido (`MAKE_INGEST_TOKEN` como secret) y verificarlo en la función.
  - **Recomendación:** opción (b) — más limpio que exponer service_role.
- **Body esperado:**
  ```json
  {
    "source": "gmail_make",
    "email_id": "1994defceb8be292",
    "sender_email": "agentes-metenergia@met.com",
    "subject": "Resumen Precios Power Península",
    "received_at": "2026-05-26T15:07:48+02:00",
    "drive_file_id": "1abc...",
    "drive_url": "https://drive.google.com/...",
    "file_name": "Resumen Precios Power Península_26052026.pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 636704,
    "sha256": "hash-opcional-si-make-lo-calcula"
  }
  ```
- **Lógica:**
  1. Validar token compartido (header `X-Valere-Ingest-Token`).
  2. Si `sha256` viene y existe en `tariff_documents` → responder `{status:"duplicate", existing_id}`.
  3. Insert en `tariff_documents` con `status='received'`.
  4. (Opcional) disparar `tariffs-extract` async via `pg_net` o cola — al principio NO, dejar manual desde la bandeja.
  5. Responder `{status:"accepted", document_id}`.

### F2.2 — Modificar escenario Make

**No tocar lo que ya funciona:**
- Watch emails con filtro de palabras clave.
- Filtro `hasAttachment = true`.
- List attachments.
- Filtro extensión + `type=attachment`.
- Upload a Drive.

**Añadir UN módulo nuevo al final:**
- HTTP > Make a request.
- URL: `https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/tariffs-ingest`
- Method: POST
- Headers: `X-Valere-Ingest-Token: <secret>`, `Content-Type: application/json`
- Body: JSON con los metadatos del email + del archivo subido a Drive.

**Eliminar:**
- El módulo Gemini suelto en el lienzo (ya no aplica — lo hace el backend).
- El filtro de "Solo PDF y Excel (no firmas)" se mantiene **pero podríamos reforzarlo** ahora que sabemos los problemas detectados.

### F2.3 — Tests `tariffs-ingest`

**Archivo nuevo:** `supabase/functions/tariffs-ingest/index.test.ts`

Tests mínimos:
- Token inválido → 401.
- Body inválido → 400.
- Documento nuevo → 201 + fila en `tariff_documents`.
- Documento con SHA repetido → 200 con `status:"duplicate"`.

---

## 5. Fase 3 — Extracción `tariffs-extract` + Bandeja

### F5.1 — Edge Function `tariffs-extract`

**Archivo nuevo:** `supabase/functions/tariffs-extract/index.ts`

- **Auth:** JWT de usuario (un comercial dispara desde UI).
- **Input:** `{document_id: uuid}`.
- **Lógica:**
  1. Descargar archivo de Drive (necesita acceso — opciones: hacer el archivo público temporalmente, o usar Service Account de Google).
  2. Llamar a Gemini con prompt específico (ver F3.2).
  3. Parsear respuesta a JSON estructurado.
  4. Buscar match con `comercializadora_ofertas` existente por `(comercializadora_id, product_name, access_rate)`.
  5. Decidir `proposed_action`: `create_new` / `update_existing` / `duplicate` / `reject`.
  6. Insert en `tariff_extractions` con todo lo anterior + `status='pending'`.
  7. Update `tariff_documents.status = 'extracted'`.
  8. Responder `{extraction_id, proposed_action, confidence_score}`.

### F5.2 — Prompt Gemini

**Archivo nuevo:** `supabase/functions/tariffs-extract/prompt.ts` (export const).

Estructura:
- Rol: experto en tarifas eléctricas españolas.
- Tarea: extraer estructura de tarifa.
- Contexto: lista de comercializadoras activas (consultada del BD al vuelo) + productos canónicos.
- Output schema: JSON con campos exactos de `comercializadora_ofertas`.
- Reglas: si la tarifa no es interpretable → `confidence_score < 0.4` y `proposed_action="reject"`.

**Iteración:** este prompt se calibra con los 4 PDFs de ejemplo que aporta Juan (ver §10).

### F5.3 — UI: Bandeja de tarifas pendientes

**Archivo nuevo:** `src/features/admin/components/TarifasPendientesTab.tsx`

**Integración:** nuevo tab dentro de `AdminPage` (siguiente al de Ofertas).

**Funcionalidad:**
- Lista de `tariff_extractions` con `status='pending'`.
- Cada fila: nombre del archivo, fecha, comercializadora detectada, producto detectado, acceso detectado, acción propuesta, confianza.
- Botón "Ver documento" → abre Drive URL.
- Botón "Validar" → modal con form prellenado de campos de `comercializadora_ofertas`. Comercial revisa, ajusta, click Publicar:
  - Si `proposed_action='create_new'`: insert nueva oferta `status='published'`.
  - Si `proposed_action='update_existing'`: marca la oferta vieja como `superseded` (con `valid_to=now()`, `superseded_by=nueva_id`), inserta nueva con `version = vieja.version + 1`.
- Botón "Rechazar" → update `tariff_extractions.status='rejected'` + `tariff_documents.status='rejected'`.
- Botón "Re-extraer" (si la confianza es baja) → reinvoca `tariffs-extract`.

### F5.4 — Hook + API

**Archivo nuevo:** `src/features/admin/api/tarifas-pendientes.ts`
- `useTarifasPendientes()` — React Query sobre `tariff_extractions` join `tariff_documents`.
- `validarTarifa(extractionId, ofertaPayload)` — mutación que actúa en BD.
- `rechazarTarifa(extractionId, motivo)` — mutación.
- `extraerTarifa(documentId)` — invoca Edge Function `tariffs-extract`.

### F5.5 — Tests

- Componente `TarifasPendientesTab`: renderiza, filtra, valida flujos.
- Hook `useTarifasPendientes`: mock Supabase.

---

## 6. Fase 4 — Versionado de ofertas

**Objetivo:** que la lógica de "publicar nueva oferta" siempre archive la vieja correctamente, también desde el importador XLSX y desde la UI de admin.

### F4.1 — Función PL/pgSQL `publish_oferta_with_versioning`

**Archivo nuevo:** `supabase/migrations/20260528_modulo_tarifas_rpc_versioning.sql`

```sql
create or replace function public.publish_oferta_with_versioning(
  p_comercializadora_id uuid,
  p_product_name        text,
  p_access_rate         text,
  p_payload             jsonb,
  p_source_document_id  uuid default null,
  p_validated_by        uuid default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_old_id uuid;
  v_old_version int;
  v_new_id uuid;
begin
  -- Buscar vigente
  select id, version into v_old_id, v_old_version
    from public.comercializadora_ofertas
   where comercializadora_id = p_comercializadora_id
     and product_name = p_product_name
     and access_rate = p_access_rate
     and status = 'published'
     and (valid_to is null or valid_to >= current_date)
   limit 1;

  -- Insertar nueva
  insert into public.comercializadora_ofertas (
    comercializadora_id, product_name, access_rate,
    energy_prices, power_prices, surplus_model, surplus_price_per_kwh,
    entry_fee_eur, entry_fee_per_kw, annual_management_fee_eur, tender_fee_pct,
    activation_fee_eur, battery_fee_per_kwp_eur, allow_zero_invoice,
    min_contract_months, include_in_comparison, show_tolls_separately, notes,
    valid_from, status, version,
    source_document_id, validated_by, validated_at
  )
  select
    p_comercializadora_id, p_product_name, p_access_rate,
    (p_payload->>'energy_prices')::jsonb::numeric[],
    (p_payload->>'power_prices')::jsonb::numeric[],
    p_payload->>'surplus_model',
    (p_payload->>'surplus_price_per_kwh')::numeric,
    (p_payload->>'entry_fee_eur')::numeric,
    (p_payload->>'entry_fee_per_kw')::numeric,
    (p_payload->>'annual_management_fee_eur')::numeric,
    (p_payload->>'tender_fee_pct')::numeric,
    (p_payload->>'activation_fee_eur')::numeric,
    (p_payload->>'battery_fee_per_kwp_eur')::numeric,
    coalesce((p_payload->>'allow_zero_invoice')::bool, false),
    (p_payload->>'min_contract_months')::int,
    coalesce((p_payload->>'include_in_comparison')::bool, true),
    coalesce((p_payload->>'show_tolls_separately')::bool, false),
    p_payload->>'notes',
    coalesce((p_payload->>'valid_from')::date, current_date),
    'published',
    coalesce(v_old_version, 0) + 1,
    p_source_document_id, p_validated_by, now()
  returning id into v_new_id;

  -- Marcar vieja como superseded
  if v_old_id is not null then
    update public.comercializadora_ofertas
       set status = 'superseded',
           valid_to = current_date - interval '1 day',
           superseded_by = v_new_id
     where id = v_old_id;
  end if;

  return v_new_id;
end;
$$;
```

### F4.2 — Adaptar `XLSXImportadorTarifas`

**Archivo a modificar:** `src/features/admin/components/XLSXImportadorTarifas.tsx`
- Cambiar el `upsert` actual por llamada a RPC `publish_oferta_with_versioning`.
- Mantener la creación automática de comercializadoras faltantes.

### F4.3 — Adaptar `OffersTab`

**Archivo a modificar:** `src/features/admin/AdminPage.tsx`
- En el botón "Guardar" del modal de edición, si es **nueva oferta** y ya existe una vigente con misma combinación → llamar `publish_oferta_with_versioning` en lugar de update directo.
- Si es **edición pura** (corregir datos sin cambiar precios) → update normal (decisión: ¿qué constituye "cambio que merece versionado"? — discutir con Juan).

### F4.4 — Nueva pantalla: "Histórico de ofertas"

**Archivo nuevo:** `src/features/admin/components/HistoricoOfertasTab.tsx`
- Filtro por comercializadora + producto.
- Muestra cadena de versiones (`v1 → v2 → v3 actual`).
- Permite ver detalle de cada versión y el documento fuente.

---

## 7. Fase 5 — Generador PDF de propuesta

**Bloqueado por NEG-B (plantilla de diseño).** No empezar hasta tener:
- Logo Valere alta resolución.
- Colores corporativos (hex).
- Tipografía oficial.
- Wireframe de plantilla (puede ser un PDF muestra hecho manualmente).

### F5.1 — Decidir tecnología de renderizado

Opciones:
- **(a) `@react-pdf/renderer`** desde el frontend (cliente renderiza). Pros: visual; Contras: bundle pesado, difícil de mantener consistencia.
- **(b) HTML → PDF server-side** vía servicio externo (Puppeteer en una Edge Function NO es trivial en Deno). Pros: control total; Contras: complejidad.
- **(c) PDFKit / pdfmake en Edge Function Deno.** Pros: zero deps externas; Contras: layout limitado.
- **(d) Servicio externo (DocRaptor, PDFShift…).** Pros: rápido; Contras: coste mensual + dependencia.

**Recomendación:** opción (a) para el MVP — más control visual, fácil iterar, y `proposals.pdf_url` se sube tras renderizar en cliente. En la fase 5.bis se puede mover a server-side si lo pide volumen.

### F5.2 — Componente plantilla

**Archivo nuevo:** `src/features/propuestas-energia/components/PropuestaTemplate.tsx`
- Renderiza usando `@react-pdf/renderer` con datos de una `proposals` row.
- Secciones: portada, datos cliente, situación actual, ranking ofertas, ahorro, recomendación, condiciones, siguientes pasos.

### F5.3 — Botón "Generar PDF"

**Archivos a modificar:**
- `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` — botón en cada fila.
- `src/features/analisis/AnalisisPage.tsx` — botón tras guardar propuesta.

Flujo: click → renderiza PDF en cliente → sube a Supabase Storage bucket `propuestas-pdf` → actualiza `proposals.pdf_url`.

---

## 8. Fase 6 — Email con aprobación manual

### F6.1 — UI: Editor de email

**Archivo nuevo:** `src/features/propuestas-energia/components/EmailDraftEditor.tsx`
- Botón "Preparar email" en cada propuesta con PDF generado.
- Modal con: destinatario (autocompletado desde `contactos`), CC, asunto plantilla, cuerpo plantilla (rich text).
- Adjunto: el PDF ya generado.
- Estados: borrador → pendiente aprobación → aprobado → enviado.
- Botón "Solicitar aprobación" → `status='pending_review'`.
- Botón "Aprobar y enviar" (sólo usuarios con `role='admin'` o `role='supervisor'`) → llama `proposals-send-email`.

### F6.2 — Edge Function `proposals-send-email`

**Archivo nuevo:** `supabase/functions/proposals-send-email/index.ts`
- Auth JWT.
- Verifica que el `email_draft.status='approved'`.
- Llama Resend con plantilla HTML + adjunto desde storage.
- Actualiza `proposal_email_drafts.status='sent'`, `sent_at`, `resend_message_id`.
- Actualiza `proposals.sent_at`.

### F6.3 — Tab "Envíos pendientes"

**Archivo nuevo:** `src/features/propuestas-energia/components/EnviosPendientesTab.tsx`
- Lista de email drafts con `status='pending_review'`.
- Para usuarios con permiso de aprobación.

---

## 9. Primer commit mínimo recomendado

**Objetivo:** que el primer commit del módulo en `claude/modulo-tarifas-propuestas` sea pequeño, revisable, no funcional todavía. Es **el commit que sienta las bases** sin tocar UI ni lógica.

**Contenido del primer commit:**

1. `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md` (este documento previo)
2. `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` (este documento)
3. Las 5 migraciones SQL aditivas de Fase 1:
   - `supabase/migrations/20260528_modulo_tarifas_extension_ofertas.sql`
   - `supabase/migrations/20260528_modulo_tarifas_logo_comercializadora.sql`
   - `supabase/migrations/20260528_modulo_tarifas_documents.sql`
   - `supabase/migrations/20260528_modulo_tarifas_extractions.sql`
   - `supabase/migrations/20260528_modulo_tarifas_proposals_extension.sql`
   - `supabase/migrations/20260528_modulo_tarifas_email_drafts.sql`
4. Regeneración de `src/core/types/database.ts` tras aplicar migraciones en prod.

**Mensaje de commit sugerido:**

```
feat(tarifas): bloque 1 modulo tarifas y propuestas — auditoria + plan + migraciones aditivas

- docs/AUDITORIA: estado real del repo (features existentes, tablas, motor calculo)
- docs/PLAN: 8 fases, archivos a tocar, criterios de aceptacion
- 6 migraciones SQL aditivas (ADD COLUMN, sin breaking changes):
  - extension comercializadora_ofertas (vigencia, estado, version, trazabilidad IA)
  - logo + web + email + agente_referencia en comercializadoras
  - tabla tariff_documents (origen documental)
  - tabla tariff_extractions (resultado IA)
  - extension proposals (cliente_id, comercial_id, flujo aprobacion)
  - tabla proposal_email_drafts (borradores email)

No toca codigo funcional. No rompe el comparador actual.
Bloqueo siguiente paso: aprobacion Juan + ChatGPT.
```

**Verificaciones pre-commit (obligatorias):**
```powershell
npx tsc --noEmit          # debe dar 0 errores
npm test -- --run          # debe pasar 39/39
git status                 # confirmar archivos correctos
git diff --stat            # confirmar tamaño razonable
```

**PR sugerido (no merge automático):**
- Base: `main`
- Compare: `claude/modulo-tarifas-propuestas`
- Título: `feat(tarifas): bloque 1 — auditoría + plan + migraciones aditivas`
- Etiqueta: `draft` hasta revisión del equipo.

---

## 10. Material que Juan tiene que reunir en paralelo

Trabajo de Juan + equipo Valere mientras la Fase 0 y Fase 1 avanzan:

### Bloqueante para Fase 3 (NEG-A):
- [ ] **4 ejemplos reales de tarifa:**
  - 1 PDF tarifa fija electricidad.
  - 1 PDF tarifa indexada electricidad.
  - 1 Excel de tarifas.
  - 1 email con la tarifa en el cuerpo (forward al email de Juan o copiar HTML).
- [ ] **Lista de comercializadoras activas** (puede ser captura del Admin actual si ya están todas).
- [ ] **Catálogo de productos canónicos** por comercializadora (¿"Power Península fijo 12m" y "Power Península fijo 24m" son 1 o 2?).

### Bloqueante para Fase 5 (NEG-B):
- [ ] **Logo Valere** en alta resolución (PNG transparente + SVG si es posible).
- [ ] **Colores corporativos** (hex).
- [ ] **Tipografía oficial** (nombre y fallback).
- [ ] **Una propuesta tuya o de un comercial reciente** que te haya parecido bien estructurada.
- [ ] **Decisión: tipo y secciones** que debe tener la propuesta Valere oficial.

### Bloqueante para Fase 6:
- [ ] **Plantilla de email** sugerida (asunto + cuerpo + firma).
- [ ] **Política de aprobación:** ¿el comercial envía directamente sus propuestas o requiere aprobación de un supervisor?
- [ ] **Verificar `RESEND_API_KEY`** configurado en producción de Supabase Functions secrets.

---

## 11. Criterios de aceptación globales

El módulo se considera **funcional MVP** cuando:

1. ✅ Make captura una tarifa nueva → llega a `tariff_documents` automáticamente.
2. ✅ Un comercial entra a "Tarifas pendientes", ve la extracción IA, valida con un clic → la oferta queda publicada y la anterior archivada como `superseded`.
3. ✅ Todos los comerciales ven la misma `OffersTab` con tarifas vigentes.
4. ✅ Un comercial selecciona un cliente con CUPS Datadis → genera comparativa → guarda propuesta.
5. ✅ Un comercial genera el PDF de la propuesta con diseño Valere.
6. ✅ Un comercial prepara el borrador de email, lo envía a aprobación; el aprobador envía con un clic.
7. ✅ Hay trazabilidad completa: `tariff_documents → tariff_extractions → comercializadora_ofertas → proposals → proposal_email_drafts`.

El módulo se considera **production-ready** cuando además:

8. ✅ 95+% de las tarifas reales que llegan son extraídas correctamente por Gemini (medir 1 mes).
9. ✅ Los comerciales reportan que la herramienta les ahorra tiempo vs el flujo manual actual.
10. ✅ Hay tests automatizados con cobertura mínima del 60 % en lógica nueva.
11. ✅ El módulo está integrado en el menú del CRM con su sistema de permisos por rol.

---

## 12. Quién hace qué (división Cowork / Code / Juan / ChatGPT)

| Responsable | Rol |
|---|---|
| **Cowork (yo)** | Director del proyecto. Mantiene este plan al día. Lee el repo para responder dudas. Prepara los briefings que Juan lleva a Claude Code. Documenta decisiones. NO escribe código de producción. |
| **Claude Code** | Ejecutor. Recibe el briefing de Cowork con la fase concreta a implementar, crea la rama, escribe código + tests + migraciones, hace commits, abre PR. |
| **Juan** | Orquestador humano. Aprueba este plan. Reúne material no técnico (NEG-A, NEG-B). Ejecuta cambios que requieren su PC (push, SQL en Supabase Dashboard, configuración Make, secrets Resend). Cierra cada fase con review del PR antes de merge. |
| **ChatGPT** | Segunda opinión estratégica. Revisa cada fase antes de aprobar. Útil para detectar puntos ciegos. NO ejecuta. |
| **OpenClaw (futuro)** | Cuando esté entrenado, agente de soporte para Juan en tareas repetitivas no críticas. NO entra en este módulo todavía. |

---

## 13. Próximo paso concreto

**Una vez Juan ejecute Fase 0 (ya con aprobación de ChatGPT en mano):**

1. Juan ejecuta Fase 0 (saneamiento: push commit, **VERIFICAR antes si SQL 28.6 ya está aplicado**, regenerar tipos, abrir rama, verificar TSC+tests). Ver §14 para los 3 matices que ChatGPT impone antes de Fase 1.
2. Juan reúne en paralelo los ejemplos NEG-A ampliado (ver `ANALISIS_FORMATOS_TARIFAS.md` §8.1) — bloquea Fase 3.
3. Cowork prepara el briefing para Claude Code de la Fase 1 (migraciones SQL aditivas **ampliadas según el análisis de formatos**), incluyendo el primer commit mínimo recomendado actualizado.
4. Claude Code ejecuta Fase 1, abre PR.
5. Juan + ChatGPT revisan PR → merge.
6. Pasamos a Fase 2.

---

## 14. Aprobación de ChatGPT (2026-05-27) — 3 matices a incorporar

ChatGPT aprobó el Bloque 1 (auditoría + plan) con tres matices técnicos que **deben aplicarse antes de empezar Fase 1**:

### 14.1 Verificar si SQL fase 28.6 ya está aplicado en producción
Hay contradicción en históricos: en `ESTADO.md` aparece listado como pendiente, pero podría haberse aplicado el 13/05. **Juan debe comprobar en Supabase Dashboard antes de re-ejecutarlo** para no duplicar policies. Comando útil en SQL editor:
```sql
select polname, tablename from pg_policies where polname ilike '%fase28%' or polname ilike '%cleanup%';
```
Si aparecen las policies del 28.6, saltar este paso. Si no, ejecutar la migración.

### 14.2 Revisar técnicamente el casteo JSONB → numeric[] en `publish_oferta_with_versioning`
El SQL propuesto en §6.1 usa `(p_payload->>'energy_prices')::jsonb::numeric[]`, que puede fallar en PostgreSQL según versión y formato. **Refactor obligatorio antes de aplicar:**

```sql
-- En lugar de:
-- (p_payload->>'energy_prices')::jsonb::numeric[]
-- Usar:
v_energy_prices := array(
  select (value)::numeric
    from jsonb_array_elements_text(p_payload->'energy_prices') with ordinality as t(value, ord)
   order by ord
);
```

Aplicable a todos los arrays (`energy_prices`, `power_prices`, etc.) y a los nuevos campos `monthly_prices`, `zones`, `sales_channels` que añade el análisis de formatos.

### 14.3 Declarar `status_v2` en `proposals` como temporal
La columna `status_v2` propuesta en §3.5 es un workaround para no chocar con el `status` legacy. **Dejar por escrito en una nota de migración y en `ESTADO.md`** que en una fase posterior (Fase 5 o un Bloque de consolidación) hay que:
1. Migrar datos de `status` legacy a `status_v2`.
2. Renombrar `status_v2` → `status` (sustituyendo el viejo).
3. Eliminar el campo legacy.

Si esto no se planifica, el módulo acabará con dos campos de estado vivos durante demasiado tiempo, generando bugs sutiles. **Crear tarea explícita en `docs/SESIONES` para no olvidar.**

---

## 15. Cambios en el primer commit mínimo (v1.1)

Tras el análisis de formatos, el commit del Bloque 1 incluye **un documento adicional**:

**Contenido del primer commit (v1.1):**
1. `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md` — sin cambios.
2. `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` — actualizado v1.1 (este documento) con §14 y §15.
3. **`docs/ANALISIS_FORMATOS_TARIFAS.md` — NUEVO** (análisis de los 8 PDFs/XLSX reales).
4. `docs/SESIONES/2026-05-27-resumen.md` — sin cambios (actualizado a la vez con el añadido del análisis).
5. `docs/ESTADO.md` — actualizado.
6. `.cowork/outbox/2026-05-27T...-modulo-tarifas-bloque1-listo.md` — sin cambios.

**Las migraciones SQL todavía NO entran en este commit.** Se quedan para el commit de Fase 1, una vez Juan haya hecho saneamiento + Cowork haya preparado el briefing concreto a Claude Code con el detalle final de las ~25 columnas + 2 sub-tablas.

---

**Fin del documento (v1.1).**
