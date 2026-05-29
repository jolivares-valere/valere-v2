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
