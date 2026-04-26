-- ═══════════════════════════════════════════════════════════════════
-- Migration: fase1_unificacion_renames_schema
-- Fecha:     2026-04-26 (sprint autónomo 6)
-- Objetivo:  Aplicar la Fase 1 del plan de Unificación Supabase.
--            (Ver docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md)
--
-- Contiene SOLO cambios de schema NO-BREAKING para el frontend:
--   • Drop tabla legacy `proposals` (residuo Calculadora pre-fusión, 0 rows)
--   • Rename de 3 tablas catálogo a nombre canónico castellano:
--       retailers              → comercializadoras
--       retailer_offers        → comercializadora_ofertas
--       boe_regulated_prices   → precios_regulados_boe
--   • Rename columna FK retailer_id → comercializadora_id en la tabla renombrada
--   • Añadir columnas a precios_regulados_boe (proceden de regulated_rates de Potencias):
--       tariff_type, rate_eur_kw_day, valid_from, valid_to, updated_by, updated_at, legacy_potencia_id
--   • Backfill de tariff_type/rate_eur_kw_day desde tariff/price (columnas viejas se mantienen)
--
-- NO toca:
--   • Renames de columna en tablas con datos vivos (empresas.nombre, cups.distribuidor,
--     user_profiles.role, etc.) — esos van en sprint coordinado con FE refactor.
--   • RLS policies (se renombran automáticamente con la tabla en Postgres).
--   • Datos del proyecto Potencias (eso es Fase 2, script aparte en scripts/).
--
-- Validado:
--   ✅ Dry-run en transacción ROLLBACK contra prod 2026-04-26
--   ✅ 0 vistas/funciones referencian las tablas a renombrar
--   ✅ Solo policies asociadas (siguen el rename automáticamente)
--   ✅ Backfill funciona: 29/29 filas de precios_regulados_boe quedan completas
--
-- Rollback:
--   begin;
--     alter table public.comercializadoras rename to retailers;
--     alter table public.comercializadora_ofertas rename to retailer_offers;
--     alter table public.comercializadora_ofertas rename column comercializadora_id to retailer_id;
--     alter table public.precios_regulados_boe rename to boe_regulated_prices;
--     alter table public.boe_regulated_prices drop column tariff_type, drop column rate_eur_kw_day,
--       drop column valid_from, drop column valid_to, drop column updated_by, drop column updated_at,
--       drop column legacy_potencia_id;
--     -- proposals: si fuera necesario recuperarla, restaurar desde dump pre-migration.
--   commit;
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ───────── 1. Drop legacy proposals (0 rows) — DESACTIVADO ─────────
-- Decisión Juan 2026-04-26: dejar tabla viva hasta que sprint FE refactor
-- consolide AnalisisPage / TrackingPage / PropuestasEnergiaPage bajo
-- propuestas canónica. Drop pasa al siguiente sprint.
-- drop table if exists public.proposals;

-- ───────── 2. Renames de catálogos ─────────
alter table public.retailers              rename to comercializadoras;
alter table public.retailer_offers        rename to comercializadora_ofertas;
alter table public.boe_regulated_prices   rename to precios_regulados_boe;

-- ───────── 3. Rename de FK retailer_id → comercializadora_id ─────────
alter table public.comercializadora_ofertas
  rename column retailer_id to comercializadora_id;

-- ───────── 4. Añadir columnas canónicas a precios_regulados_boe ─────────
alter table public.precios_regulados_boe
  add column if not exists tariff_type        text,
  add column if not exists rate_eur_kw_day    numeric,
  add column if not exists valid_from         date,
  add column if not exists valid_to           date,
  add column if not exists updated_by         uuid references public.user_profiles(id),
  add column if not exists updated_at         timestamptz not null default now(),
  add column if not exists legacy_potencia_id uuid;

-- ───────── 5. Backfill de columnas nuevas desde columnas viejas ─────────
update public.precios_regulados_boe
   set tariff_type     = tariff,
       rate_eur_kw_day = price
 where tariff_type is null;

-- ───────── 6. Comentarios para trazabilidad ─────────
comment on table public.comercializadoras            is 'Catálogo maestro de comercializadoras energéticas. Renombrada desde retailers en fase1 unificación 2026-04-26.';
comment on table public.comercializadora_ofertas     is 'Ofertas comerciales por comercializadora. Renombrada desde retailer_offers en fase1 unificación 2026-04-26.';
comment on table public.precios_regulados_boe        is 'Precios regulados BOE por periodo y tarifa. Renombrada desde boe_regulated_prices en fase1 unificación 2026-04-26. Añadidas columnas canónicas (tariff_type, rate_eur_kw_day, valid_from/to, updated_by/at) compatibles con regulated_rates de Potencias.';

commit;
