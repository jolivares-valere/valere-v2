-- ═══════════════════════════════════════════════════════════════════
-- Módulo Energía v2 — Sprint 0.2: observabilidad, DST y cursor de backfill
-- Incorpora condiciones de auditoría 2026-07-14 (C1, C3, C4).
--
-- C1 — datadis_runs: trazabilidad de cada ejecución de worker (los logs de
--      Edge Functions en plan gratuito se retienen poco).
-- C3 — relajar el CHECK de hora en datadis_consumptions a 0..24 para tolerar
--      el día de cambio de hora de OCTUBRE (25 intervalos → hora 0..24) sin
--      colisionar con el UNIQUE(cups_id,fecha,hora) ni descartar la hora extra.
-- C4 — vista de cursor (sin tabla nueva): última fecha guardada por CUPS,
--      para arrancar el backfill incremental por el CUPS con datos más antiguos.
-- ═══════════════════════════════════════════════════════════════════

-- ── C1 · Observabilidad de runs ──────────────────────────────────────
create table if not exists public.datadis_runs (
  id uuid primary key default gen_random_uuid(),
  worker text not null,                       -- 'datadis-sync' | 'datadis-consumos'
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  dry_run boolean not null default true,
  cups_procesados integer not null default 0,
  llamadas integer not null default 0,        -- nº de llamadas HTTP a Datadis
  filas_insertadas integer not null default 0,
  errores jsonb not null default '[]'::jsonb, -- [{cups, etapa, error}]
  resumen jsonb,                              -- métricas libres del run
  created_at timestamptz not null default now()
);
create index if not exists idx_datadis_runs_worker_started
  on public.datadis_runs(worker, started_at desc);

alter table public.datadis_runs enable row level security;
drop policy if exists datadis_runs_select on public.datadis_runs;
create policy datadis_runs_select on public.datadis_runs
  for select to authenticated using (public.is_staff());
revoke all on public.datadis_runs from anon;

-- ── C3 · DST: la hora puede ir 0..24 (día de 25 h en octubre) ────────
alter table public.datadis_consumptions drop constraint if exists datadis_consumptions_hora_check;
alter table public.datadis_consumptions add constraint datadis_consumptions_hora_check
  check (hora between 0 and 24);

-- ── C4 · Cursor de backfill (última fecha por CUPS), sin tabla nueva ──
-- Se apoya en el índice (cups_id, fecha) ya existente → max por grupo eficiente.
create or replace view public.v_datadis_consumos_cursor as
  select cups_id, max(fecha) as ultima_fecha
  from public.datadis_consumptions
  group by cups_id;

-- Nota: las vistas heredan la RLS de la tabla base (security_invoker por defecto
-- en PG15+ para vistas nuevas no es automático; datadis_consumptions ya tiene RLS
-- y el worker usa service_role, que la ignora). El frontend no consulta esta vista.
