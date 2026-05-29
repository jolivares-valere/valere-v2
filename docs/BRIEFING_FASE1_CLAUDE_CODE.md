# Briefing Fase 1 — Modelo de datos del Módulo Tarifas y Propuestas (v1.1)

> **Para:** Claude Code (ejecutor)
> **De:** Cowork (director)
> **Fecha:** 2026-05-28 (v1.1 — tras revisión técnica de ChatGPT)
> **Rama de trabajo:** `claude/modulo-tarifas-propuestas` (ya creada con Bloque 1 commiteado)
> **Documentos de contexto (lee si necesitas justificación):**
> - `docs/AUDITORIA_MODULO_TARIFAS_PROPUESTAS.md` — estado actual del repo
> - `docs/PLAN_MODULO_TARIFAS_PROPUESTAS.md` — plan por fases (v1.1)
> - `docs/ANALISIS_FORMATOS_TARIFAS.md` — análisis de tarifas reales que justifica el alcance
>
> **REGLA DE ORO:** Si hay contradicción entre este briefing y los documentos anteriores, **prevalece este briefing**.
>
> ## Changelog v1.1 (correcciones técnicas tras revisión ChatGPT)
>
> 1. **Índices sin `current_date`** — PostgreSQL exige predicados IMMUTABLE en índices parciales. `current_date` no lo es: el `CREATE INDEX` fallaría. Reemplazado por índices parciales sólo con `status = 'published'` + `valid_to` indexado como columna. Aplicado a `comercializadora_ofertas` y `comercializadora_productos_servicios`.
> 2. **RPC `publish_oferta_with_versioning` filtra por zona principal** — la versión v1.0 supersedía por `(comercializadora_id, product_name, access_rate)` sin filtrar por zona. Con multi-zona (Península/Baleares/Canarias/…) eso archivaba ofertas de Península al publicar Baleares. Ahora el `select v_old_id` añade filtro por `zones[1]` (zona principal por convención). El cálculo de `v_zones` se reordenó para estar ANTES del select.
> 3. **RPC con check de autorización interna** — al ser `SECURITY DEFINER` con `grant execute to authenticated`, el RPC bypaseaba RLS. Añadido check al inicio: verifica que `auth.uid()` exista y que el usuario esté `approved=true` en `user_profiles`. Si no, `raise exception 'not authorized'` con código `42501`.
> 4. **Eliminada la contradicción sobre `database.ts`** — la versión v1.0 decía "posiblemente regeneras" en §2 y "no regeneres" en §3.1/§7. Ahora §2 es categórico: **NO regenerar `database.ts` en Fase 1**.

---

## 1. Qué tienes que hacer (resumen ejecutivo)

Crear **9 ficheros nuevos de migración SQL** en `supabase/migrations/`, ejecutar TSC + tests, hacer commit y push.

**NO toques nada más.** No UI, no Edge Functions, no Make, no PDF, no email. Esto es Fase 1: sólo modelo de datos + RPC de versionado.

Cuando termines, abre PR draft a `main` desde `claude/modulo-tarifas-propuestas`.

---

## 2. Reglas duras (no negociables)

1. **Todas las migraciones son aditivas.** Sólo `CREATE TABLE`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`. **PROHIBIDO** `DROP TABLE`, `DROP COLUMN`, `ALTER ... RENAME`, `ALTER ... ALTER TYPE` (salvo casts seguros).
2. **Nombres de tabla en español.** Las existentes son `comercializadoras` y `comercializadora_ofertas`. Las nuevas las nombras `tariff_documents`, `tariff_extractions`, `proposal_email_drafts`, `comercializadora_productos_servicios`, `oferta_precios_mensuales`. (Sí, hay mezcla idiomática — es deliberado: las "tariff_*" siguen el patrón inglés que ya tienen `proposals`, `cups`, `retailer_offers` archivado, etc.; las nuevas relacionadas con comercializadora siguen el patrón español que ya tiene `comercializadora_ofertas`.)
3. **Cero cambios a UI, hooks, Edge Functions, scripts, tests existentes.** Sólo añades 9 migraciones SQL nuevas + 1 fichero de test placeholder. **NO regeneres `database.ts` bajo ningún concepto** — eso lo hará Juan tras aplicar las migraciones en producción.
4. **Todas las migraciones son idempotentes** (`IF NOT EXISTS` / `IF EXISTS` donde corresponda) — se deben poder ejecutar varias veces sin error.
5. **RLS activada en todas las tablas nuevas** con policies para `authenticated` con `approved=true`.
6. **Comentarios SQL en cabecera de cada migración** explicando qué hace y por qué.
7. **No ejecutes las migraciones contra producción.** Juan las aplicará después manualmente vía Supabase Dashboard tras review. Tú sólo creas los ficheros + el commit.

---

## 3. Fichero a fichero — código SQL completo listo para pegar

### 3.1 `supabase/migrations/20260528_modulo_tarifas_01_ext_ofertas.sql`

Extensión de `comercializadora_ofertas` con los campos que el análisis de formatos reveló. Todos opcionales (NULL por defecto).

```sql
-- =====================================================================
-- FASE 1 · Migración 01/09 — Extensión de comercializadora_ofertas
-- =====================================================================
-- Añade columnas necesarias para capturar la variabilidad real de las
-- tarifas que entregan las comercializadoras españolas (Iberdrola, MET,
-- Visalia, Endesa, UniEléctrica, Energya-VM, Gana, Nexus...).
--
-- Hallazgos que motivan cada columna están en
-- docs/ANALISIS_FORMATOS_TARIFAS.md §4 y §5.
--
-- TODAS aditivas. Idempotentes. No rompe el comparador actual de
-- AnalisisPage ni el importador XLSXImportadorTarifas.
-- =====================================================================

-- ── Identidad y tipo de tarifa ────────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists pricing_type text
    check (pricing_type in ('fixed','indexed','mixed','pvpc','fixed_temporary'))
    default 'fixed';

alter table public.comercializadora_ofertas
  add column if not exists index_margin_per_kwh numeric;

alter table public.comercializadora_ofertas
  add column if not exists power_unit text
    check (power_unit in ('eur_kw_year','eur_kw_day','eur_kw_month'))
    default 'eur_kw_year';

-- ── Vigencia y estado (versionado) ────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists valid_from date;

alter table public.comercializadora_ofertas
  add column if not exists valid_to date;

alter table public.comercializadora_ofertas
  add column if not exists status text
    check (status in ('pending_validation','published','superseded','rejected','draft'))
    default 'published';

alter table public.comercializadora_ofertas
  add column if not exists version int default 1;

alter table public.comercializadora_ofertas
  add column if not exists superseded_by uuid
    references public.comercializadora_ofertas(id);

-- ── Trazabilidad IA ───────────────────────────────────────────────────
-- source_document_id: FK añadida tras crear tariff_documents en migración 03.
alter table public.comercializadora_ofertas
  add column if not exists source_document_id uuid;

alter table public.comercializadora_ofertas
  add column if not exists extracted_by_ai bool default false;

alter table public.comercializadora_ofertas
  add column if not exists confidence_score numeric
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1));

-- ── Validación humana ─────────────────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists validated_by uuid
    references public.user_profiles(id);

alter table public.comercializadora_ofertas
  add column if not exists validated_at timestamptz;

-- ── Zona geográfica ───────────────────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists zones text[] default array['peninsula'];

-- ── Umbral por sub-variante de tarifa (Iberdrola 2.0TD_2 vs 2.0TD_3) ──
alter table public.comercializadora_ofertas
  add column if not exists power_p1_threshold_kw numeric;

alter table public.comercializadora_ofertas
  add column if not exists power_p1_threshold_op text
    check (power_p1_threshold_op is null or power_p1_threshold_op in ('lte','gt'));

-- ── Características del producto ──────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists telemedida text
    check (telemedida in ('telemedido','no_telemedido','ambos'))
    default 'ambos';

alter table public.comercializadora_ofertas
  add column if not exists exempt_electricity_tax bool default false;

alter table public.comercializadora_ofertas
  add column if not exists contractable bool default true;

alter table public.comercializadora_ofertas
  add column if not exists green_energy_gdo bool default false;

alter table public.comercializadora_ofertas
  add column if not exists sales_channels text[];

alter table public.comercializadora_ofertas
  add column if not exists requires_electronic_invoice bool default false;

alter table public.comercializadora_ofertas
  add column if not exists auto_renewal_months int;

alter table public.comercializadora_ofertas
  add column if not exists tempo_hours_discount_pct numeric;

alter table public.comercializadora_ofertas
  add column if not exists tempo_hours_description text;

alter table public.comercializadora_ofertas
  add column if not exists price_revision_terms text;

-- ── Descuentos ────────────────────────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists discount_description text;

alter table public.comercializadora_ofertas
  add column if not exists discount_pct_energy numeric;

alter table public.comercializadora_ofertas
  add column if not exists discount_pct_power numeric;

alter table public.comercializadora_ofertas
  add column if not exists discount_fixed_eur_year numeric;

-- ── Trazabilidad de promoción ─────────────────────────────────────────
alter table public.comercializadora_ofertas
  add column if not exists is_promotional bool default false;

alter table public.comercializadora_ofertas
  add column if not exists non_promotional_oferta_id uuid
    references public.comercializadora_ofertas(id);

-- ── Extensión flexible para variabilidad no estructurable ─────────────
alter table public.comercializadora_ofertas
  add column if not exists extension_data jsonb;

-- ── Índices nuevos para el comparador con vigencia ────────────────────
-- IMPORTANTE: PostgreSQL exige funciones IMMUTABLE en predicados de
-- índices parciales. current_date NO lo es, así que NO se puede usar
-- en el WHERE del índice. Solución: índice parcial sólo por status,
-- incluir valid_to como columna indexada para filtrar luego en consultas.
create index if not exists idx_ofertas_published_lookup
  on public.comercializadora_ofertas (comercializadora_id, product_name, access_rate, valid_to)
  where status = 'published';

create index if not exists idx_ofertas_status
  on public.comercializadora_ofertas (status);

create index if not exists idx_ofertas_superseded_by
  on public.comercializadora_ofertas (superseded_by)
  where superseded_by is not null;

-- ── Backfill: ofertas existentes ──────────────────────────────────────
-- Marcar todas las ofertas previas como published v1 sin caducidad.
-- Sólo si las columnas vienen NULL (no pisar valores manuales).
update public.comercializadora_ofertas
   set status = coalesce(status, 'published'),
       version = coalesce(version, 1),
       contractable = coalesce(contractable, true),
       telemedida = coalesce(telemedida, 'ambos'),
       power_unit = coalesce(power_unit, 'eur_kw_year'),
       pricing_type = coalesce(pricing_type, 'fixed'),
       zones = coalesce(zones, array['peninsula']),
       extracted_by_ai = coalesce(extracted_by_ai, false),
       is_promotional = coalesce(is_promotional, false),
       green_energy_gdo = coalesce(green_energy_gdo, false),
       requires_electronic_invoice = coalesce(requires_electronic_invoice, false),
       exempt_electricity_tax = coalesce(exempt_electricity_tax, false)
 where status is null or version is null;

NOTIFY pgrst, 'reload schema';
```

### 3.2 `supabase/migrations/20260528_modulo_tarifas_02_ext_comercializadoras.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 02/09 — Extensión de comercializadoras
-- =====================================================================
-- Añade: logo_url (para mostrar en propuestas), web, email_contacto,
-- agente_referencia (datos comerciales del contacto Valere).
-- =====================================================================

alter table public.comercializadoras
  add column if not exists logo_url text;

alter table public.comercializadoras
  add column if not exists web text;

alter table public.comercializadoras
  add column if not exists email_contacto text;

alter table public.comercializadoras
  add column if not exists agente_referencia text;

NOTIFY pgrst, 'reload schema';
```

### 3.3 `supabase/migrations/20260528_modulo_tarifas_03_documents.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 03/09 — Tabla tariff_documents
-- =====================================================================
-- Registro de cada documento (PDF/Excel/email) recibido como origen de
-- una tarifa. Make → tariffs-ingest crea la fila en estado 'received'.
-- Tras extracción IA: 'extracted'. Tras validación humana: 'validated'
-- o 'rejected'.
-- =====================================================================

create table if not exists public.tariff_documents (
  id              uuid primary key default gen_random_uuid(),
  source          text not null
    check (source in ('gmail_make','manual_upload','retailer_crm')),
  email_id        text,
  sender_email    text,
  subject         text,
  received_at     timestamptz default now(),
  drive_file_id   text,
  drive_url       text,
  file_name       text,
  mime_type       text,
  file_size_bytes bigint,
  sha256          text unique,
  status          text not null default 'received'
    check (status in (
      'received',
      'duplicate_exact',
      'pending_extraction',
      'extracted',
      'pending_validation',
      'validated',
      'rejected',
      'error'
    )),
  error_message text,
  notes         text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- FK pendiente desde comercializadora_ofertas.source_document_id
-- (la columna ya existe tras migración 01; aquí cerramos el FK).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'fk_oferta_source_document'
  ) then
    alter table public.comercializadora_ofertas
      add constraint fk_oferta_source_document
      foreign key (source_document_id)
      references public.tariff_documents(id)
      on delete set null;
  end if;
end$$;

create index if not exists idx_tariff_documents_status
  on public.tariff_documents(status);

create index if not exists idx_tariff_documents_sha
  on public.tariff_documents(sha256);

create index if not exists idx_tariff_documents_sender
  on public.tariff_documents(sender_email);

create index if not exists idx_tariff_documents_received_at
  on public.tariff_documents(received_at desc);

-- RLS
alter table public.tariff_documents enable row level security;

drop policy if exists tariff_documents_all_approved on public.tariff_documents;
create policy tariff_documents_all_approved
  on public.tariff_documents
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
```

### 3.4 `supabase/migrations/20260528_modulo_tarifas_04_extractions.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 04/09 — Tabla tariff_extractions
-- =====================================================================
-- Resultado de la extracción IA sobre un tariff_document.
-- Permite reextracción (varias filas por document_id) y auditoría.
-- =====================================================================

create table if not exists public.tariff_extractions (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null
    references public.tariff_documents(id) on delete cascade,
  model_name          text not null,
  raw_response_json   jsonb,
  structured_json     jsonb,
  confidence_score    numeric
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  proposed_action     text
    check (proposed_action in ('create_new','update_existing','duplicate','reject')),
  proposed_oferta_id  uuid
    references public.comercializadora_ofertas(id) on delete set null,
  status              text not null default 'pending'
    check (status in ('pending','validated','rejected','error')),
  error_message       text,
  created_at          timestamptz default now() not null,
  validated_by        uuid references public.user_profiles(id),
  validated_at        timestamptz
);

create index if not exists idx_tariff_extractions_document_id
  on public.tariff_extractions(document_id);

create index if not exists idx_tariff_extractions_status
  on public.tariff_extractions(status);

alter table public.tariff_extractions enable row level security;

drop policy if exists tariff_extractions_all_approved on public.tariff_extractions;
create policy tariff_extractions_all_approved
  on public.tariff_extractions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
```

### 3.5 `supabase/migrations/20260528_modulo_tarifas_05_ext_proposals.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 05/09 — Extensión de proposals
-- =====================================================================
-- Añade campos para vincular la propuesta a empresa/contacto/comercial
-- y para el flujo de aprobación + envío.
--
-- NOTA: el campo `status` legacy se conserva sin tocar. El nuevo
-- `status_v2` se introduce para no chocar con datos existentes; en una
-- fase posterior de consolidación habrá que: (a) migrar datos legacy
-- → v2, (b) renombrar v2 → status, (c) eliminar el legacy. Crear tarea
-- explícita en docs/ESTADO.md cuando llegue su momento.
-- =====================================================================

alter table public.proposals
  add column if not exists empresa_id uuid references public.empresas(id);

alter table public.proposals
  add column if not exists contacto_id uuid references public.contactos(id);

alter table public.proposals
  add column if not exists comercial_id uuid references public.user_profiles(id);

alter table public.proposals
  add column if not exists approved_by uuid references public.user_profiles(id);

alter table public.proposals
  add column if not exists approved_at timestamptz;

alter table public.proposals
  add column if not exists sent_at timestamptz;

alter table public.proposals
  add column if not exists status_v2 text
    check (status_v2 in ('draft','pending_review','approved','sent','rejected'))
    default 'draft';

create index if not exists idx_proposals_status_v2
  on public.proposals(status_v2);

create index if not exists idx_proposals_empresa_id
  on public.proposals(empresa_id)
  where empresa_id is not null;

create index if not exists idx_proposals_comercial_id
  on public.proposals(comercial_id)
  where comercial_id is not null;

NOTIFY pgrst, 'reload schema';
```

### 3.6 `supabase/migrations/20260528_modulo_tarifas_06_email_drafts.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 06/09 — Tabla proposal_email_drafts
-- =====================================================================
-- Borrador de email asociado a una propuesta. Estado pendiente de
-- aprobación → aprobado → enviado vía Resend (Fase 6).
-- =====================================================================

create table if not exists public.proposal_email_drafts (
  id                  uuid primary key default gen_random_uuid(),
  proposal_id         uuid not null
    references public.proposals(id) on delete cascade,
  to_email            text not null,
  cc_email            text,
  bcc_email           text,
  subject             text not null,
  body_html           text not null,
  body_text           text,
  status              text not null default 'draft'
    check (status in ('draft','pending_review','approved','sent','rejected','error')),
  created_by          uuid references public.user_profiles(id),
  approved_by         uuid references public.user_profiles(id),
  approved_at         timestamptz,
  sent_at             timestamptz,
  error_message       text,
  resend_message_id   text,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

create index if not exists idx_email_drafts_proposal_id
  on public.proposal_email_drafts(proposal_id);

create index if not exists idx_email_drafts_status
  on public.proposal_email_drafts(status);

alter table public.proposal_email_drafts enable row level security;

drop policy if exists email_drafts_all_approved on public.proposal_email_drafts;
create policy email_drafts_all_approved
  on public.proposal_email_drafts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
```

### 3.7 `supabase/migrations/20260528_modulo_tarifas_07_productos_servicios.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 07/09 — Tabla comercializadora_productos_servicios
-- =====================================================================
-- Catálogo paralelo de servicios opcionales (PyS = Productos y
-- Servicios) que ofrecen las comercializadoras además de la tarifa.
-- Ejemplo Iberdrola: Pack Hogar 8.95€/mes, Protección Eléctrica
-- Hogar Plus 8.95€/mes, etc. Pueden dar descuento sobre la tarifa
-- principal (PyS Tier 1/2).
-- =====================================================================

create table if not exists public.comercializadora_productos_servicios (
  id                          uuid primary key default gen_random_uuid(),
  comercializadora_id         uuid not null
    references public.comercializadoras(id) on delete cascade,
  nombre                      text not null,
  tipo                        text
    check (tipo in ('asistencia','seguro','mantenimiento','digital','solar','aerotermia','movilidad','otros')),
  precio_mes_eur              numeric,
  precio_mes_eur_con_iva      numeric,
  precio_mes_eur_con_igic     numeric,
  precio_mes_eur_con_ipsi     numeric,
  cliente_objetivo            text,
  promocion                   text,
  descuento_tier              int
    check (descuento_tier is null or descuento_tier in (1,2)),
  valid_from                  date,
  valid_to                    date,
  status                      text default 'published'
    check (status in ('published','superseded','draft','rejected')),
  source_document_id          uuid references public.tariff_documents(id) on delete set null,
  notes                       text,
  created_at                  timestamptz default now() not null
);

create index if not exists idx_productos_servicios_comercializadora
  on public.comercializadora_productos_servicios(comercializadora_id);

-- IMPORTANTE: NO usar current_date en WHERE de índice parcial
-- (no es IMMUTABLE). Indexar valid_to como columna en su lugar.
create index if not exists idx_productos_servicios_published
  on public.comercializadora_productos_servicios(comercializadora_id, nombre, valid_to)
  where status = 'published';

alter table public.comercializadora_productos_servicios enable row level security;

drop policy if exists productos_servicios_all_approved on public.comercializadora_productos_servicios;
create policy productos_servicios_all_approved
  on public.comercializadora_productos_servicios
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
```

### 3.8 `supabase/migrations/20260528_modulo_tarifas_08_precios_mensuales.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 08/09 — Tabla oferta_precios_mensuales
-- =====================================================================
-- Sub-tabla para tarifas de gas con precios mes a mes (MET, Energya-VM).
-- Una oferta de gas "fija a 12 meses" puede tener 12 valores distintos,
-- uno por mes. También usado para componentes adicionales (MIBGAS,
-- Componente Mg). El componente se identifica con `componente`.
-- =====================================================================

create table if not exists public.oferta_precios_mensuales (
  id                  uuid primary key default gen_random_uuid(),
  oferta_id           uuid not null
    references public.comercializadora_ofertas(id) on delete cascade,
  mes_yyyy_mm         text not null
    check (mes_yyyy_mm ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  precio_energia_kwh  numeric,
  componente          text,
  notes               text,
  created_at          timestamptz default now() not null,
  unique (oferta_id, mes_yyyy_mm, componente)
);

create index if not exists idx_precios_mensuales_oferta
  on public.oferta_precios_mensuales(oferta_id);

create index if not exists idx_precios_mensuales_mes
  on public.oferta_precios_mensuales(mes_yyyy_mm);

alter table public.oferta_precios_mensuales enable row level security;

drop policy if exists precios_mensuales_all_approved on public.oferta_precios_mensuales;
create policy precios_mensuales_all_approved
  on public.oferta_precios_mensuales
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
```

### 3.9 `supabase/migrations/20260528_modulo_tarifas_09_rpc_publish_oferta.sql`

```sql
-- =====================================================================
-- FASE 1 · Migración 09/09 — RPC publish_oferta_with_versioning
-- =====================================================================
-- Función principal del versionado: publica una oferta nueva y archiva
-- la versión anterior con la misma combinación lógica
-- (comercializadora, product_name, access_rate, zona principal).
--
-- IMPORTANTE: el casteo de arrays JSON → numeric[] usa la sintaxis
-- correcta de PostgreSQL con jsonb_array_elements_text(...) WITH
-- ORDINALITY, según matiz #2 de ChatGPT en la revisión del PLAN v1.1.
-- =====================================================================

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
set search_path = public
as $$
declare
  v_old_id        uuid;
  v_old_version   int;
  v_new_id        uuid;
  v_energy_prices numeric[];
  v_power_prices  numeric[];
  v_zones         text[];
  v_main_zone     text;
  v_channels      text[];
begin
  -- ── Control de autorización (SECURITY DEFINER bypassea RLS) ──────
  -- Verificar que quien invoca es un usuario authenticated y aprobado
  -- en user_profiles. Sin esto, cualquier authenticated podría insertar
  -- tarifas en producción sin pasar por la bandeja de validación.
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles
     where id = auth.uid() and approved = true
  ) then
    raise exception 'not authorized: user not approved or not authenticated'
      using errcode = '42501';  -- insufficient_privilege
  end if;

  -- ── Convertir arrays JSON → arrays nativos PostgreSQL ────────────
  -- Sintaxis correcta: jsonb_array_elements_text WITH ORDINALITY.
  -- IMPORTANTE: v_zones se calcula ANTES de buscar la versión anterior
  -- porque el versionado debe filtrar por zona principal (v_zones[1]),
  -- no sólo por comercializadora+producto+acceso. Si no, publicar una
  -- oferta nueva de Baleares supersedería la de Península incorrectamente.
  v_energy_prices := case
    when p_payload ? 'energy_prices' then array(
      select nullif(t.value, '')::numeric
        from jsonb_array_elements_text(p_payload->'energy_prices')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else null
  end;

  v_power_prices := case
    when p_payload ? 'power_prices' then array(
      select nullif(t.value, '')::numeric
        from jsonb_array_elements_text(p_payload->'power_prices')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else null
  end;

  v_zones := case
    when p_payload ? 'zones' then array(
      select t.value
        from jsonb_array_elements_text(p_payload->'zones')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else array['peninsula']
  end;

  v_channels := case
    when p_payload ? 'sales_channels' then array(
      select t.value
        from jsonb_array_elements_text(p_payload->'sales_channels')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else null
  end;

  -- Zona principal = primer elemento del array de zonas.
  -- Convención: el array se ordena con la zona principal en posición 1.
  v_main_zone := v_zones[1];

  -- ── Buscar la versión vigente actual de esta combinación lógica ──
  -- Filtro completo: comercializadora + producto + acceso + ZONA PRINCIPAL.
  -- Si la oferta antigua tiene zones NULL (datos legacy pre-Fase 1) o
  -- coincide su primera zona con v_main_zone, es la candidata.
  select id, version
    into v_old_id, v_old_version
    from public.comercializadora_ofertas
   where comercializadora_id = p_comercializadora_id
     and product_name = p_product_name
     and access_rate = p_access_rate
     and status = 'published'
     and (
       zones is null                       -- legacy sin zona declarada
       or array_length(zones, 1) is null   -- array vacío
       or zones[1] = v_main_zone           -- misma zona principal
     )
   order by version desc nulls last
   limit 1;

  -- ── Insertar nueva versión ───────────────────────────────────────
  insert into public.comercializadora_ofertas (
    comercializadora_id,
    product_name,
    access_rate,
    energy_prices,
    power_prices,
    power_unit,
    pricing_type,
    index_margin_per_kwh,
    surplus_model,
    surplus_price_per_kwh,
    entry_fee_eur,
    entry_fee_per_kw,
    annual_management_fee_eur,
    tender_fee_pct,
    activation_fee_eur,
    battery_fee_per_kwp_eur,
    allow_zero_invoice,
    min_contract_months,
    include_in_comparison,
    show_tolls_separately,
    notes,
    valid_from,
    valid_to,
    status,
    version,
    source_document_id,
    extracted_by_ai,
    confidence_score,
    validated_by,
    validated_at,
    zones,
    power_p1_threshold_kw,
    power_p1_threshold_op,
    telemedida,
    exempt_electricity_tax,
    contractable,
    green_energy_gdo,
    sales_channels,
    requires_electronic_invoice,
    auto_renewal_months,
    tempo_hours_discount_pct,
    tempo_hours_description,
    price_revision_terms,
    discount_description,
    discount_pct_energy,
    discount_pct_power,
    discount_fixed_eur_year,
    is_promotional,
    non_promotional_oferta_id,
    extension_data
  )
  values (
    p_comercializadora_id,
    p_product_name,
    p_access_rate,
    v_energy_prices,
    v_power_prices,
    coalesce(p_payload->>'power_unit', 'eur_kw_year'),
    coalesce(p_payload->>'pricing_type', 'fixed'),
    nullif(p_payload->>'index_margin_per_kwh', '')::numeric,
    p_payload->>'surplus_model',
    nullif(p_payload->>'surplus_price_per_kwh', '')::numeric,
    nullif(p_payload->>'entry_fee_eur', '')::numeric,
    nullif(p_payload->>'entry_fee_per_kw', '')::numeric,
    nullif(p_payload->>'annual_management_fee_eur', '')::numeric,
    nullif(p_payload->>'tender_fee_pct', '')::numeric,
    nullif(p_payload->>'activation_fee_eur', '')::numeric,
    nullif(p_payload->>'battery_fee_per_kwp_eur', '')::numeric,
    coalesce((p_payload->>'allow_zero_invoice')::bool, false),
    nullif(p_payload->>'min_contract_months', '')::int,
    coalesce((p_payload->>'include_in_comparison')::bool, true),
    coalesce((p_payload->>'show_tolls_separately')::bool, false),
    p_payload->>'notes',
    coalesce(nullif(p_payload->>'valid_from', '')::date, current_date),
    nullif(p_payload->>'valid_to', '')::date,
    'published',
    coalesce(v_old_version, 0) + 1,
    p_source_document_id,
    coalesce((p_payload->>'extracted_by_ai')::bool, p_source_document_id is not null),
    nullif(p_payload->>'confidence_score', '')::numeric,
    p_validated_by,
    case when p_validated_by is not null then now() else null end,
    v_zones,
    nullif(p_payload->>'power_p1_threshold_kw', '')::numeric,
    p_payload->>'power_p1_threshold_op',
    coalesce(p_payload->>'telemedida', 'ambos'),
    coalesce((p_payload->>'exempt_electricity_tax')::bool, false),
    coalesce((p_payload->>'contractable')::bool, true),
    coalesce((p_payload->>'green_energy_gdo')::bool, false),
    v_channels,
    coalesce((p_payload->>'requires_electronic_invoice')::bool, false),
    nullif(p_payload->>'auto_renewal_months', '')::int,
    nullif(p_payload->>'tempo_hours_discount_pct', '')::numeric,
    p_payload->>'tempo_hours_description',
    p_payload->>'price_revision_terms',
    p_payload->>'discount_description',
    nullif(p_payload->>'discount_pct_energy', '')::numeric,
    nullif(p_payload->>'discount_pct_power', '')::numeric,
    nullif(p_payload->>'discount_fixed_eur_year', '')::numeric,
    coalesce((p_payload->>'is_promotional')::bool, false),
    nullif(p_payload->>'non_promotional_oferta_id', '')::uuid,
    case when p_payload ? 'extension_data' then p_payload->'extension_data' else null end
  )
  returning id into v_new_id;

  -- ── Archivar versión anterior, si existía ────────────────────────
  if v_old_id is not null then
    update public.comercializadora_ofertas
       set status        = 'superseded',
           valid_to      = current_date - interval '1 day',
           superseded_by = v_new_id
     where id = v_old_id;
  end if;

  return v_new_id;
end;
$$;

-- Grant ejecución a usuarios autenticados aprobados.
-- (Como es SECURITY DEFINER, ejecuta con permisos del owner; el control
-- lo hacemos en el cuerpo de la función si en el futuro queremos
-- restringir por rol. Por ahora, cualquier authenticated puede invocar.)
grant execute on function public.publish_oferta_with_versioning(uuid, text, text, jsonb, uuid, uuid)
  to authenticated;

NOTIFY pgrst, 'reload schema';
```

---

## 4. Tests obligatorios

### 4.1 Nuevo fichero `src/features/admin/__tests__/publishOfertaWithVersioning.test.ts`

Sólo si existe el patrón de tests con cliente Supabase mock. Si en el repo no hay ya un patrón de tests de integración SQL, **NO inventes infraestructura nueva** — limítate a:

(a) **Verificar que `npm test -- --run` sigue dando 129/129**.
(b) Crear el fichero **placeholder** documentado abajo, con un `describe.skip` y un comentario explicando que los tests reales del RPC se añadirán en Fase 2 cuando exista el cliente para llamarlo desde una Edge Function.

```typescript
import { describe, it } from 'vitest'

/**
 * Tests del RPC publish_oferta_with_versioning.
 *
 * Estos tests están SKIP de momento porque el RPC se prueba mejor
 * end-to-end desde la Edge Function de Fase 3 (tariffs-extract), donde
 * sí hay un cliente Supabase server-side autenticado.
 *
 * Cuando se implemente Fase 3, mover estos casos a un test de
 * integración real:
 *
 * - Caso 1: insertar primera versión → status='published', version=1.
 * - Caso 2: insertar segunda versión de la misma combinación →
 *   anterior pasa a 'superseded', nueva es version=2.
 * - Caso 3: payload con arrays numéricos → se castean correctamente.
 * - Caso 4: payload con zones=['peninsula','baleares'] → array[]
 *   correcto.
 * - Caso 5: payload sin 'zones' → default ['peninsula'].
 * - Caso 6: payload con extension_data → se guarda como jsonb.
 * - Caso 7: SECURITY DEFINER respeta RLS al insertar.
 */
describe.skip('publish_oferta_with_versioning (TODO Fase 3)', () => {
  it('placeholder — implementar en Fase 3', () => {
    // intencionalmente vacío
  })
})
```

### 4.2 Verificaciones técnicas obligatorias antes de commit

Ejecuta en este orden y todos deben pasar:

```powershell
cd C:\Users\joliv\valere-v2
npx tsc --noEmit
npm test -- --run
```

- `npx tsc --noEmit` debe dar **0 errores**.
- `npm test -- --run` debe pasar **129/129** (las nuevas migraciones NO se ejecutan en tests, sólo añaden ficheros).

Si TSC falla porque algún tipo cambió tras las migraciones — **NO toques los tipos manualmente, NO toques `database.ts`**. Las migraciones nuevas no se aplican localmente, así que `database.ts` no debería cambiar. Si cambia, es que has aplicado migraciones localmente con `supabase db push`, lo cual NO debes hacer. Revierte y avísame.

---

## 5. Commit y push

```powershell
git status
# Esperado: ~10 ficheros en untracked dentro de supabase/migrations/ y
# src/features/admin/__tests__/

git add supabase/migrations/20260528_modulo_tarifas_*.sql `
        src/features/admin/__tests__/publishOfertaWithVersioning.test.ts

git status
# Verificar: sólo esos 10 ficheros en verde

git commit -m "feat(tarifas-fase1): 8 migraciones aditivas + RPC publish_oferta_with_versioning (modelo datos modulo tarifas)"

git push origin claude/modulo-tarifas-propuestas

git log --oneline -10
```

---

## 6. Criterios de aceptación

Al terminar, debes poder responder SÍ a todo esto:

- [ ] Existen los 9 ficheros SQL en `supabase/migrations/` con el nombre exacto indicado en §3.
- [ ] El test placeholder en `src/features/admin/__tests__/` existe.
- [ ] `npx tsc --noEmit` da 0 errores.
- [ ] `npm test -- --run` pasa 129/129 (los placeholders están en `describe.skip`, así que no cuentan).
- [ ] El commit `feat(tarifas-fase1): ...` está pusheado en `origin/claude/modulo-tarifas-propuestas`.
- [ ] **NO has modificado ningún fichero fuera de `supabase/migrations/` y `src/features/admin/__tests__/`** (ni siquiera `database.ts`).
- [ ] **NO has ejecutado `supabase db push` ni migraciones contra prod.**
- [ ] El `git log --oneline -10` muestra tu commit nuevo justo después del `1f22535`.

---

## 7. Qué NO hacer en esta fase (recordatorio)

- ❌ NO crear Edge Functions todavía (`tariffs-ingest`, `tariffs-extract`, `proposals-*`) — eso es Fase 2-6.
- ❌ NO crear pantallas UI nuevas (`TarifasPendientesTab`, `EmailDraftEditor`, etc.).
- ❌ NO modificar `XLSXImportadorTarifas.tsx` ni `AnalisisPage.tsx` ni `AdminPage.tsx`.
- ❌ NO regenerar `database.ts` localmente — esto se hará tras aplicar migraciones en prod, en otra fase.
- ❌ NO aplicar las migraciones en Supabase prod — eso lo hará Juan tras review del PR.
- ❌ NO escribir el prompt Gemini ni la plantilla PDF.

---

## 8. Qué hacer si algo se rompe

- Si TSC falla → no commitees. Revierte cambios locales con `git checkout -- .` y avisa.
- Si tests fallan → idem.
- Si una de las migraciones SQL tiene un error de sintaxis que no puedes ver — **no la "arregles a ojo"**. Pega el error completo en un comentario del PR y para. Cowork lo revisa.
- Si te encuentras tentado a tocar algo fuera de los 10 ficheros — para y consulta.

---

## 9. Tras el push — lo que viene después (Juan, no tú)

1. Juan revisa el PR draft en GitHub.
2. Juan aplica las 9 migraciones manualmente en Supabase Dashboard (SQL editor), en orden numérico (01 → 09).
3. Juan regenera tipos: `supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts`. Verifica que aparecen las nuevas columnas y tablas.
4. Juan commit + push del `database.ts` regenerado.
5. Juan abre el PR para review final con ChatGPT.
6. Merge a `main`.
7. Cowork prepara briefing de Fase 2 (Edge Function `tariffs-ingest` + modificación del escenario Make).

---

**Fin del briefing. Adelante.**
