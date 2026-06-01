-- =====================================================================
-- FASE 2 — Migración: Tabla precios_pool_horarios (caché ESIOS)
-- =====================================================================
-- Almacena los precios horarios del mercado eléctrico obtenidos de la
-- API de ESIOS (REE). La Edge Function esios-price-cache rellena esta
-- tabla nightly. El frontend y calculator.ts leen de aquí (nunca
-- consultan ESIOS directamente).
--
-- Indicadores que se cachean:
--   600   → Precio spot mercado diario OMIE (€/MWh)
--   1001  → PVPC término energía 2.0TD (€/kWh)
--   10211 → PVPC precio total 2.0TD (€/kWh)
--   1739  → Compensación excedentes FV (€/kWh)
--   10349 → Factor de emisiones CO₂ (gCO₂/kWh)
-- =====================================================================

create table if not exists public.precios_pool_horarios (
  id            uuid primary key default gen_random_uuid(),
  hora_utc      timestamptz not null,
  indicador_id  integer not null,
  indicador_nom text not null,
  valor         numeric not null,
  unidad        text not null,
  geo_id        integer not null default 3,  -- 3 = Península Ibérica
  fuente        text not null default 'esios',
  created_at    timestamptz default now() not null,

  unique (hora_utc, indicador_id, geo_id)
);

comment on table public.precios_pool_horarios is
  'Caché horaria de precios de mercado eléctrico (ESIOS/REE). Rellena la Edge Function esios-price-cache.';
comment on column public.precios_pool_horarios.indicador_id is
  'ID numérico del indicador ESIOS. Ver docs/ANALISIS_ESIOS_INTEGRACION.md para el mapa completo.';
comment on column public.precios_pool_horarios.valor is
  'Valor en la unidad original del indicador (ver columna unidad). No se normaliza al insertar.';
comment on column public.precios_pool_horarios.unidad is
  'EUR_MWh | EUR_kWh | gCO2_kWh';

-- Índices para las consultas habituales
create index if not exists idx_precios_pool_hora_indicador
  on public.precios_pool_horarios (indicador_id, hora_utc desc);

create index if not exists idx_precios_pool_hora_rango
  on public.precios_pool_horarios (hora_utc desc);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.precios_pool_horarios enable row level security;

-- Usuarios aprobados pueden leer
drop policy if exists precios_pool_read_approved on public.precios_pool_horarios;
create policy precios_pool_read_approved
  on public.precios_pool_horarios
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and approved = true
    )
  );

-- Solo service_role puede insertar/actualizar (Edge Function usa service key)
drop policy if exists precios_pool_write_service on public.precios_pool_horarios;
create policy precios_pool_write_service
  on public.precios_pool_horarios
  for all
  to service_role
  using (true)
  with check (true);

NOTIFY pgrst, 'reload schema';
